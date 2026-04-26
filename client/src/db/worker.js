// Runs sqlite-wasm in a dedicated Web Worker. Needed because
// FileSystemFileHandle.createSyncAccessHandle() is only exposed to Workers, so
// any OPFS-backed VFS (SAH pool or otherwise) fails on the main thread.
// Main thread talks to us via the RPC shape in ./local.js.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// Baked into the bundle at build time. The sync loop compares this against
// X-App-Schema-Version on every /api/changes response; mismatch → post a
// schemaMismatch event to the main thread and stop polling.
const CLIENT_SCHEMA_VERSION = import.meta.env.VITE_APP_SCHEMA_VERSION || 'dev';

let sqlite3 = null;
let pool = null;
let db = null;

// Sync state: the server's _changes table names to the client's local tables.
// Most match 1:1; `users` on the server projects into `users_public` locally
// (the server omits password_hash from the change row, so the shapes line up).
const TABLE_MAP = {
  users: 'users_public',
  users_public: 'users_public',
  user_countries: 'user_countries',
  user_cities: 'user_cities',
  user_provinces: 'user_provinces',
};

const TABLE_COLUMNS = {
  users_public: ['id', 'identifier', 'home_country'],
  user_countries: ['id', 'user_id', 'country_code', 'visited_at'],
  user_cities: ['id', 'user_id', 'city_id', 'visited_at'],
  user_provinces: ['id', 'user_id', 'province_code', 'visited_at'],
};

let syncApiBase = '';
let syncAuthToken = null;
let syncTimer = null;
let syncInFlight = false;
let syncStopped = true;
const POLL_INTERVAL_MS = 5000;
const POLL_BACKOFF_MS = 30000;

// Serialises anything that holds a SQLite transaction or savepoint. Without
// this, the sync poll's BEGIN/COMMIT and a mutation's open SAVEPOINT can
// interleave on the same connection and SQLite blows up with "cannot start a
// transaction within a transaction". Queue is FIFO via a promise chain.
let txLock = Promise.resolve();
function withTx(fn) {
  const prev = txLock;
  let release;
  const next = new Promise((r) => { release = r; });
  txLock = next;
  return prev.then(fn).finally(release);
}
let mutateCounter = 0;

const DDL = [
  `CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY,
    name TEXT,
    region TEXT,
    subregion TEXT,
    population INTEGER,
    annual_tourists INTEGER,
    area_km2 REAL,
    lat REAL,
    lng REAL
  )`,
  `CREATE TABLE IF NOT EXISTS cities (
    id TEXT PRIMARY KEY,
    country_code TEXT,
    name TEXT,
    population INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS provinces (
    id TEXT PRIMARY KEY,
    country_code TEXT,
    code TEXT UNIQUE,
    name TEXT,
    population INTEGER,
    area_km2 REAL,
    disputed INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS users_public (
    id TEXT PRIMARY KEY,
    identifier TEXT,
    home_country TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_countries (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    country_code TEXT,
    visited_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_cities (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    city_id TEXT,
    visited_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_provinces (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    province_code TEXT,
    visited_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_subregions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    subregion TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT)`,
];

function ensureSchema() {
  db.exec('BEGIN');
  try {
    for (const stmt of DDL) db.exec(stmt);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  // Idempotent column additions for existing DBs (ALTER TABLE fails silently if already present)
  try { db.exec('ALTER TABLE countries ADD COLUMN subregion TEXT'); } catch { /* already exists */ }
}

function bulkInsert(table, rows, columns) {
  if (!rows.length) return;
  const placeholders = columns.map(() => '?').join(',');
  const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
  const stmt = db.prepare(sql);
  try {
    for (const row of rows) {
      stmt.bind(columns.map((c) => row[c] === undefined ? null : row[c]));
      stmt.stepReset();
    }
  } finally {
    stmt.finalize();
  }
}

async function hydrate(apiBase, authToken) {
  const existing = db.selectValue(`SELECT value FROM _meta WHERE key = 'cursor'`);
  if (existing !== undefined) return Number(existing);

  const url = `${apiBase}/api/snapshot`;
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`snapshot failed: ${res.status} ${res.statusText}`);
  const snap = await res.json();

  db.exec('BEGIN');
  try {
    bulkInsert('countries', snap.countries, [
      'code', 'name', 'region', 'subregion', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng',
    ]);
    bulkInsert('cities', snap.cities, ['id', 'country_code', 'name', 'population']);
    bulkInsert('provinces', snap.provinces, [
      'id', 'country_code', 'code', 'name', 'population', 'area_km2', 'disputed',
    ]);
    bulkInsert('users_public', snap.users_public, ['id', 'identifier', 'home_country']);
    // User-visit tables are part of the cold-boot payload so pre-existing
    // writes (made before this client's cursor) aren't orphaned. The changes
    // feed then handles everything from the snapshot cursor forward.
    bulkInsert('user_countries', snap.user_countries || [], ['id', 'user_id', 'country_code', 'visited_at']);
    bulkInsert('user_cities', snap.user_cities || [], ['id', 'user_id', 'city_id', 'visited_at']);
    bulkInsert('user_provinces', snap.user_provinces || [], ['id', 'user_id', 'province_code', 'visited_at']);
    bulkInsert('user_subregions', snap.user_subregions || [], ['id', 'user_id', 'subregion']);
    db.exec({
      sql: `INSERT OR REPLACE INTO _meta (key, value) VALUES ('cursor', ?)`,
      bind: [String(snap.cursor)],
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return Number(snap.cursor);
}

function getCursor() {
  const v = db.selectValue(`SELECT value FROM _meta WHERE key = 'cursor'`);
  return v === undefined ? 0 : Number(v);
}

// Apply one batch of changes + advance cursor in a single transaction. We don't
// allow partial progress: if any row fails, we roll back and leave the cursor
// where it was so the next tick retries the same window. Unknown tables are
// skipped with a warning — happens if the server introduces a new table before
// the client bundle catches up (a schema-version bump will wipe + resnapshot).
//
// Serialised through withTx so mutate's savepoint can't interleave.
//
// Cursor never regresses: if an in-flight poll fetched `?since=K` and the
// server replied with changes up to M while a Phase-5 optimistic mutation has
// already fast-forwarded the cursor past M, we still want to apply the rows
// (they're idempotent) but leave the cursor at the higher value. Otherwise a
// stale poll would rewind the cursor and the next tick would re-fetch and
// re-apply our own write.
function writeCursor(newCursor) {
  const current = getCursor();
  if (Number(newCursor) > current) {
    db.exec({
      sql: `INSERT OR REPLACE INTO _meta (key, value) VALUES ('cursor', ?)`,
      bind: [String(newCursor)],
    });
  }
}

function applyBatch(changes, newCursor) {
  return withTx(() => {
    if (!changes.length) {
      writeCursor(newCursor);
      return;
    }

    db.exec('BEGIN');
    try {
      for (const ch of changes) {
        const localTable = TABLE_MAP[ch.table];
        if (!localTable) {
          console.warn('[sync] skipping change for unknown table:', ch.table);
          continue;
        }
        if (ch.op === 'delete') {
          db.exec({ sql: `DELETE FROM ${localTable} WHERE id = ?`, bind: [String(ch.pk)] });
        } else {
          // insert or update — both use INSERT OR REPLACE with the row shape.
          const cols = TABLE_COLUMNS[localTable];
          if (!cols || !ch.row) continue;
          const placeholders = cols.map(() => '?').join(',');
          const bind = cols.map((c) => ch.row[c] === undefined ? null : ch.row[c]);
          db.exec({
            sql: `INSERT OR REPLACE INTO ${localTable} (${cols.join(',')}) VALUES (${placeholders})`,
            bind,
          });
        }
      }
      writeCursor(newCursor);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  });
}

// Phase 5: optimistic mutation. Opens a savepoint, applies the local writes,
// fires the network call while the savepoint is still open, then either
// RELEASES (success) or ROLLS BACK (failure). Fast-forwards _meta.cursor past
// the server-assigned change_id on success so the next poll doesn't re-apply
// our own echo.
//
// We keep the savepoint open across `await fetch(...)` deliberately — that's
// the invariant that lets the UI see the optimistic row instantly and still
// undo cleanly if the server rejects. All of this runs under withTx so the
// sync poll can't BEGIN concurrently.
async function handleMutate({ preSteps, endpoint, method, body }) {
  return withTx(async () => {
    const spName = `sp_m${++mutateCounter}`;
    db.exec(`SAVEPOINT ${spName}`);
    let settled = false;
    try {
      for (const step of preSteps || []) {
        db.exec({ sql: step.sql, bind: step.bind || [] });
      }

      const url = `${syncApiBase}${endpoint}`;
      const headers = { 'Content-Type': 'application/json' };
      if (syncAuthToken) headers.Authorization = `Bearer ${syncAuthToken}`;
      const res = await fetch(url, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
      });

      // Schema drift on a mutation response: roll back the optimistic write and
      // kick the main thread to wipe. Symmetric with the poll-loop check.
      const serverSchema = res.headers.get('X-App-Schema-Version');
      if (serverSchema && serverSchema !== CLIENT_SCHEMA_VERSION) {
        db.exec(`ROLLBACK TO ${spName}`);
        db.exec(`RELEASE ${spName}`);
        settled = true;
        syncStopped = true;
        self.postMessage({
          type: 'schemaMismatch',
          clientVersion: CLIENT_SCHEMA_VERSION,
          serverVersion: serverSchema,
        });
        const err = new Error('Schema version mismatch');
        err.status = res.status;
        throw err;
      }

      let responseBody = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseBody = await res.json();
      }

      if (!res.ok) {
        db.exec(`ROLLBACK TO ${spName}`);
        db.exec(`RELEASE ${spName}`);
        settled = true;
        const err = new Error(
          (responseBody && responseBody.error) || `Request failed (${res.status})`,
        );
        err.status = res.status;
        err.errors = (responseBody && responseBody.errors) || [];
        throw err;
      }

      // Fast-forward the cursor so the next /api/changes poll doesn't re-apply
      // our own write. writeCursor() only advances — never rewinds — so a
      // concurrent poll landing after us with a lower newCursor can't undo it.
      const newChangeId = responseBody && responseBody.change_id;
      if (newChangeId !== undefined && newChangeId !== null) {
        writeCursor(newChangeId);
      }

      db.exec(`RELEASE ${spName}`);
      settled = true;
      return { status: res.status, body: responseBody };
    } catch (err) {
      if (!settled) {
        // Network error or SQL error before we reached the HTTP branches — roll
        // the savepoint back so the optimistic insert doesn't linger.
        try { db.exec(`ROLLBACK TO ${spName}`); } catch {}
        try { db.exec(`RELEASE ${spName}`); } catch {}
      }
      throw err;
    }
  });
}

// One poll: fetch /api/changes, check X-App-Schema-Version, apply, loop while
// has_more. Returns when drained or on error. Never throws — errors are logged
// and left to the next tick.
async function pollOnce() {
  if (syncStopped || !db) return;
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    while (!syncStopped) {
      const since = getCursor();
      const url = `${syncApiBase}/api/changes?since=${since}`;
      const headers = syncAuthToken ? { Authorization: `Bearer ${syncAuthToken}` } : {};
      const res = await fetch(url, { headers });

      // Schema drift on the server means our DDL/row shapes might not match
      // what the next change row carries. Stop, tell main thread, let it wipe.
      const serverSchema = res.headers.get('X-App-Schema-Version');
      if (serverSchema && serverSchema !== CLIENT_SCHEMA_VERSION) {
        syncStopped = true;
        self.postMessage({
          type: 'schemaMismatch',
          clientVersion: CLIENT_SCHEMA_VERSION,
          serverVersion: serverSchema,
        });
        return;
      }

      if (!res.ok) throw new Error(`changes failed: ${res.status}`);
      const body = await res.json();
      const cursor = Number(body.cursor);
      await applyBatch(body.changes || [], cursor);

      if (body.changes && body.changes.length) {
        self.postMessage({
          type: 'syncTick',
          applied: body.changes.length,
          cursor,
        });
      }

      if (!body.has_more) return;
      // Drain: loop immediately when the server says there's more.
    }
  } catch (err) {
    console.warn('[sync] poll failed, will retry:', err && err.message);
    // Back off once before the next tick by pushing the timer out. The timer
    // callback is the only thing that re-arms the interval.
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(tickThenSchedule, POLL_BACKOFF_MS);
    }
  } finally {
    syncInFlight = false;
  }
}

function tickThenSchedule() {
  pollOnce().finally(() => {
    if (!syncStopped) {
      syncTimer = setTimeout(tickThenSchedule, POLL_INTERVAL_MS);
    }
  });
}

function startSync({ apiBase, authToken }) {
  syncApiBase = apiBase || '';
  syncAuthToken = authToken || null;
  syncStopped = false;
  if (syncTimer) clearTimeout(syncTimer);
  // Fire first tick immediately so the UI catches up without waiting 5 s.
  syncTimer = setTimeout(tickThenSchedule, 0);
}

function stopSync() {
  syncStopped = true;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

// Delete every traveleria-v*.db in the current OPFS pool. Called by the main
// thread on schema mismatch so the next reload cold-boots. We close the
// currently-open DB first and null it out — the main thread reloads the page
// immediately after this resolves, so no one else touches the handle.
//
// `pool.wipeFiles()` is the SAH-pool-canonical "release everything" that also
// drops zombie SAH locks (the kind that leak when a tab crashes mid-write).
// Falling back to per-file unlink keeps us working if the API ever moves.
async function wipeAllDbs() {
  stopSync();
  if (db) { try { db.close(); } catch {} db = null; }
  if (!pool) return { wiped: 0 };

  if (typeof pool.wipeFiles === 'function') {
    try {
      await pool.wipeFiles();
      return { wiped: 'all', method: 'wipeFiles' };
    } catch (e) {
      console.warn('[sync] pool.wipeFiles failed, falling back to per-file unlink:', e && e.message);
    }
  }

  const names = pool.getFileNames();
  let wiped = 0;
  for (const name of names) {
    if (name.startsWith('/traveleria-v')) {
      try {
        await pool.unlink(name);
        wiped += 1;
      } catch (e) {
        console.warn('[sync] unlink failed for', name, e && e.message);
      }
    }
  }
  return { wiped };
}

// Did the underlying error come from OPFS SAH lock contention? Happens when a
// previous worker (a crashed tab, a StrictMode-double-mounted dev session) is
// still holding a SAH handle for the same file. Recoverable by wiping the pool.
function isSahLockError(err) {
  const msg = err && (err.message || String(err));
  if (!msg) return false;
  return /Access Handles cannot be created|createSyncAccessHandle/i.test(msg);
}

async function handle(cmd, args = {}) {
  switch (cmd) {
    case 'open': {
      if (!sqlite3) {
        sqlite3 = await sqlite3InitModule({
          print: (m) => console.log('[sqlite]', m),
          printErr: (m) => console.error('[sqlite]', m),
        });
      }
      if (!pool) {
        pool = await sqlite3.installOpfsSAHPoolVfs({ name: args.poolName });
      }
      if (db) { try { db.close(); } catch {} db = null; }
      // Self-heal once on SAH lock contention. A previous tab/worker can leave
      // SAH handles dangling (browser crash, StrictMode double-mount in dev).
      // wipeFiles() drops all known files in the pool which releases their
      // handles, then we retry the open. Snapshot will re-hydrate.
      try {
        db = new pool.OpfsSAHPoolDb(args.fileName);
      } catch (e) {
        if (!isSahLockError(e)) throw e;
        console.warn('[sync] SAH lock contention on open — wiping pool and retrying:', e.message);
        if (typeof pool.wipeFiles === 'function') await pool.wipeFiles();
        db = new pool.OpfsSAHPoolDb(args.fileName);
      }
      ensureSchema();
      const cursor = await hydrate(args.apiBase || '', args.authToken || null);
      return { fileName: args.fileName, cursor };
    }
    case 'all':
      return db.selectObjects(args.sql, args.bind);
    case 'get':
      return db.selectObject(args.sql, args.bind);
    case 'value':
      return db.selectValue(args.sql, args.bind);
    case 'exec':
      db.exec({ sql: args.sql, bind: args.bind });
      return { ok: true };
    case 'close':
      stopSync();
      if (db) { try { db.close(); } catch {} db = null; }
      return { ok: true };
    case 'mutate':
      return await handleMutate(args);
    case 'startSync':
      startSync(args);
      return { ok: true };
    case 'stopSync':
      stopSync();
      return { ok: true };
    case 'wipeAllDbs':
      return await wipeAllDbs();
    default:
      throw new Error(`unknown cmd: ${cmd}`);
  }
}

self.onmessage = async (e) => {
  const { id, cmd, args } = e.data || {};
  // Event messages (no id) are worker→main only; ignore anything inbound.
  if (id === undefined) return;
  try {
    const result = await handle(cmd, args);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    // Preserve `status` and `errors` across the worker boundary so mutate
    // callers can render per-field feedback from 422 validation responses.
    self.postMessage({
      id,
      ok: false,
      error: err && err.message ? err.message : String(err),
      status: err && err.status,
      errors: err && err.errors,
    });
  }
};
