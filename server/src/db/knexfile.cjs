const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Client_Libsql = require('./libsql-dialect.cjs');

const migrationsDir = path.resolve(__dirname, 'migrations');
const seedsDir = path.resolve(__dirname, 'seeds');

// Determine if we're connecting over HTTP (Turso cloud or local sqld)
// vs a local file: URL. HTTP connections don't support PRAGMA and
// don't need connection pooling the same way.
const dbUrl = process.env.TURSO_DATABASE_URL || '';
const isHttp = /^(https?|libsql|wss?):\/\//.test(dbUrl);

// Build the connection filename
function getConnectionUrl() {
  if (!dbUrl) {
    return `file:${path.resolve(__dirname, '../../data/dev.sqlite3')}`;
  }
  const token = process.env.TURSO_AUTH_TOKEN;
  if (token) {
    return `${dbUrl}?authToken=${token}`;
  }
  // No token — fine for local sqld, not for Turso cloud
  return dbUrl;
}

// Pool config: HTTP connections don't support PRAGMA and need minimal pooling
const httpPool = { min: 0, max: 1, idleTimeoutMillis: 1000, acquireTimeoutMillis: 10000 };
const filePool = {
  afterCreate(conn, done) {
    // Our custom dialect returns { client, tx } — use client.execute()
    conn.client.execute('PRAGMA foreign_keys = ON')
      .then(() => done())
      .catch(done);
  },
};
const pool = isHttp ? httpPool : filePool;

const sharedConfig = {
  client: Client_Libsql,
  useNullAsDefault: true,
  migrations: { directory: migrationsDir, loadExtensions: ['.cjs'] },
  seeds: { directory: seedsDir, loadExtensions: ['.cjs'] },
  pool,
};

module.exports = {
  development: {
    ...sharedConfig,
    connection: {
      filename: getConnectionUrl(),
    },
  },

  test: {
    ...sharedConfig,
    connection: {
      filename: `file:${path.resolve(__dirname, '../../data/test.sqlite3')}`,
    },
    // Tests always use file pool with PRAGMA
    pool: filePool,
  },

  production: {
    ...sharedConfig,
    connection: {
      filename: getConnectionUrl(),
    },
  },
};
