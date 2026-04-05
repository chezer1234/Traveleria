const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Client_Libsql = require('@libsql/knex-libsql');

const migrationsDir = path.resolve(__dirname, 'migrations');
const seedsDir = path.resolve(__dirname, 'seeds');

// Enable foreign keys after each connection is created (SQLite doesn't enforce by default)
const pool = {
  afterCreate(conn, done) {
    conn.run('PRAGMA foreign_keys = ON', done);
  },
};

module.exports = {
  development: {
    client: Client_Libsql,
    connection: {
      filename: process.env.TURSO_DATABASE_URL || `file:${path.resolve(__dirname, '../../data/dev.sqlite3')}`,
    },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
    pool,
  },

  test: {
    client: Client_Libsql,
    connection: {
      filename: `file:${path.resolve(__dirname, '../../data/test.sqlite3')}`,
    },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
    pool,
  },

  production: {
    client: Client_Libsql,
    connection: {
      filename: process.env.TURSO_DATABASE_URL
        ? `${process.env.TURSO_DATABASE_URL}?authToken=${process.env.TURSO_AUTH_TOKEN}`
        : `file:${path.resolve(__dirname, '../../data/prod.sqlite3')}`,
    },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
    pool,
  },
};
