// Main-thread facade for the sqlite-wasm Worker. The actual DB lives in the
// Worker (see ./worker.js); this module exposes a tiny promise-based API so
// callers in the UI layer don't care about postMessage plumbing.

const SCHEMA_VERSION = import.meta.env.VITE_APP_SCHEMA_VERSION || 'dev';

let worker = null;
let msgCounter = 0;
const pending = new Map();

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const { id, ok, result, error } = e.data || {};
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    ok ? p.resolve(result) : p.reject(new Error(error));
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
const openEntries = new Map();

export async function openUserDb(userId, apiBase = '') {
  const fileName = `/traveleria-v${SCHEMA_VERSION}-${userId}.db`;
  if (openEntries.has(fileName)) return openEntries.get(fileName);

  const { cursor } = await rpc('open', {
    poolName: `traveleria-v${SCHEMA_VERSION}`,
    fileName,
    apiBase,
  });

  const entry = {
    fileName,
    cursor,
    all: (sql, bind) => rpc('all', { sql, bind }),
    get: (sql, bind) => rpc('get', { sql, bind }),
    value: (sql, bind) => rpc('value', { sql, bind }),
    exec: (sql, bind) => rpc('exec', { sql, bind }),
  };
  openEntries.set(fileName, entry);
  return entry;
}

export async function closeUserDb(userId) {
  const fileName = `/traveleria-v${SCHEMA_VERSION}-${userId}.db`;
  if (!openEntries.has(fileName)) return;
  try { await rpc('close'); } catch {}
  openEntries.delete(fileName);
}
