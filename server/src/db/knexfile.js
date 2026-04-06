const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const Client_Libsql = require('@libsql/knex-libsql');

const migrationsDir = path.resolve(__dirname, 'migrations');
const seedsDir = path.resolve(__dirname, 'seeds');

// Enable foreign keys for local file-based SQLite (Turso handles this server-side)
const isRemote = (process.env.TURSO_DATABASE_URL || '').startsWith('libsql://');
const pool = isRemote
  ? {}
  : {
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
      filename: (() => {
        if (process.env.TURSO_DATABASE_URL) {
          const url = process.env.TURSO_DATABASE_URL;
          const token = process.env.TURSO_AUTH_TOKEN;
          if (!token) {
            console.error('TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is set');
            process.exit(1);
          }
          return `${url}?authToken=${token}`;
        }
        return `file:${path.resolve(__dirname, '../../data/prod.sqlite3')}`;
      })(),
    },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
    seeds: { directory: seedsDir },
    pool,
  },
};
