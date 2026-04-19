// Main-thread facade for the sqlite-wasm Worker. The actual DB lives in the
// Worker (see ./worker.js); this module exposes a tiny promise-based API so
// callers in the UI layer don't care about postMessage plumbing.

const SCHEMA_VERSION = import.meta.env.VITE_APP_SCHEMA_VERSION || 'dev';

let worker = null;
let msgCounter = 0;
const pending = new Map();

// Event listeners registered via onWorkerEvent (e.g. for schemaMismatch +
// syncTick). Event messages from the worker have no `id`, so we dispatch
// them here instead of resolving a pending promise.
const eventListeners = new Map();

export function onWorkerEvent(type, handler) {
  if (!eventListeners.has(type)) eventListeners.set(type, new Set());
  eventListeners.get(type).add(handler);
  return () => eventListeners.get(type)?.delete(handler);
}

function emitEvent(type, payload) {
  const handlers = eventListeners.get(type);
  if (!handlers) return;
  for (const h of handlers) {
    try { h(payload); } catch (e) { console.error('[worker-event]', type, e); }
  }
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const data = e.data || {};
    // RPC responses carry an id; events don't.
    if (data.id !== undefined) {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      data.ok ? p.resolve(data.result) : p.reject(new Error(data.error));
      return;
    }
    if (data.type) emitEvent(data.type, data);
  };
  worker.onerror = (e) => {
    console.error('[sqlite-worker] uncaught', e.message || e);
  };
  return worker;
}

function rpc(cmd, args) {
  const id = ++msgCounter;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ensureWorker().postMessage({ id, cmd, args });
  });
}

// Per-user DB entry. Calls hop through the worker, so everything here is async.
// We cache the in-flight Promise (not just the resolved entry) so concurrent
// callers — most commonly React StrictMode firing the effect twice in dev —
// share one 'open' RPC. Two RPCs in-flight against the same file races for
// OPFS SAH locks and fails with "Access Handles cannot be created if there is
// another open Access Handle". Caching the promise dedupes them.
const openEntries = new Map();

export async function openUserDb(userId, apiBase = '', authToken = null) {
  const fileName = `/traveleria-v${SCHEMA_VERSION}-${userId}.db`;
  if (openEntries.has(fileName)) return openEntries.get(fileName);

  const promise = (async () => {
    try {
      const { cursor } = await rpc('open', {
        poolName: `traveleria-v${SCHEMA_VERSION}`,
        fileName,
        apiBase,
        authToken,
      });

      // Kick the 5 s poll loop. The worker handles visibility-insensitive polling,
      // exponential back-off on errors, and the schema-version mismatch trap. We
      // don't block open on the first tick.
      await rpc('startSync', { apiBase, authToken });

      return {
        fileName,
        cursor,
        all: (sql, bind) => rpc('all', { sql, bind }),
        get: (sql, bind) => rpc('get', { sql, bind }),
        value: (sql, bind) => rpc('value', { sql, bind }),
        exec: (sql, bind) => rpc('exec', { sql, bind }),
        stopSync: () => rpc('stopSync'),
        wipeAllDbs: () => rpc('wipeAllDbs'),
      };
    } catch (err) {
      // Drop the failed promise so the next caller gets a fresh attempt
      // instead of forever returning the same rejection.
      openEntries.delete(fileName);
      throw err;
    }
  })();

  openEntries.set(fileName, promise);
  return promise;
}

export async function closeUserDb(userId) {
  const fileName = `/traveleria-v${SCHEMA_VERSION}-${userId}.db`;
  const pending = openEntries.get(fileName);
  if (!pending) return;
  // Wait for the in-flight open to settle so we don't close before it lands.
  try { await pending; } catch {}
  try { await rpc('stopSync'); } catch {}
  try { await rpc('close'); } catch {}
  openEntries.delete(fileName);
}

// Schema-version mismatch recovery: wipe every traveleria-v*.db in OPFS and
// hard-reload. Callers should typically just listen for 'schemaMismatch' via
// onWorkerEvent and invoke this — see AuthContext.
export async function wipeAndReload() {
  try { await rpc('wipeAllDbs'); } catch (e) { console.warn('[wipeAndReload]', e); }
  if (typeof window !== 'undefined') window.location.reload();
}
