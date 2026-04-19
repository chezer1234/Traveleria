// Runs sqlite-wasm in a dedicated Web Worker. Needed because
// FileSystemFileHandle.createSyncAccessHandle() is only exposed to Workers, so
// any OPFS-backed VFS (SAH pool or otherwise) fails on the main thread.
// Main thread talks to us via the RPC shape in ./local.js.

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let sqlite3 = null;
let pool = null;
let db = null;

const DDL = [
  `CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY,
    name TEXT,
    region TEXT,
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
      'code', 'name', 'region', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng',
    ]);
    bulkInsert('cities', snap.cities, ['id', 'country_code', 'name', 'population']);
    bulkInsert('provinces', snap.provinces, [
      'id', 'country_code', 'code', 'name', 'population', 'area_km2', 'disputed',
    ]);
    bulkInsert('users_public', snap.users_public, ['id', 'identifier', 'home_country']);
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
      db = new pool.OpfsSAHPoolDb(args.fileName);
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
      if (db) { try { db.close(); } catch {} db = null; }
      return { ok: true };
    default:
      throw new Error(`unknown cmd: ${cmd}`);
  }
}

self.onmessage = async (e) => {
  const { id, cmd, args } = e.data || {};
  try {
    const result = await handle(cmd, args);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
