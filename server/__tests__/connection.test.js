/**
 * Tests for database connection and basic health checks.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');
const knexfile = require('../src/db/knexfile');

let db;

beforeAll(async () => {
  db = knex(knexfile.test);
});

afterAll(async () => {
  await db.destroy();
});

describe('Database Connection', () => {
  test('can connect to the test database', async () => {
    const result = await db.raw('SELECT 1 + 1 AS result');
    expect(result[0].result).toBe(2);
  });

  test('database is SQLite/libSQL', async () => {
    const result = await db.raw('SELECT sqlite_version() AS version');
    expect(result[0].version).toBeDefined();
  });

  test('knexfile has all environments configured', () => {
    expect(knexfile).toHaveProperty('development');
    expect(knexfile).toHaveProperty('test');
    expect(knexfile).toHaveProperty('production');
  });

  test('test environment uses a file-based connection', () => {
    expect(knexfile.test.connection.filename).toContain('test.sqlite3');
  });

  test('development environment has a connection configured', () => {
    expect(knexfile.development.connection.filename).toBeDefined();
  });

  test('all environments use libSQL client', () => {
    const Client_Libsql = require('../src/db/libsql-dialect');
    expect(knexfile.development.client).toBe(Client_Libsql);
    expect(knexfile.test.client).toBe(Client_Libsql);
    expect(knexfile.production.client).toBe(Client_Libsql);
  });
});
