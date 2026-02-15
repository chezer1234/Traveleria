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
    expect(result.rows[0].result).toBe(2);
  });

  test('database is PostgreSQL', async () => {
    const result = await db.raw('SELECT version()');
    expect(result.rows[0].version).toMatch(/PostgreSQL/);
  });

  test('knexfile has all environments configured', () => {
    expect(knexfile).toHaveProperty('development');
    expect(knexfile).toHaveProperty('test');
    expect(knexfile).toHaveProperty('production');
  });

  test('test environment uses the test database', () => {
    expect(knexfile.test.connection.database).toBe('travelpoints_test');
  });

  test('development environment uses the dev database', () => {
    expect(knexfile.development.connection.database).toBe('travelpoints');
  });

  test('all environments use PostgreSQL client', () => {
    expect(knexfile.development.client).toBe('pg');
    expect(knexfile.test.client).toBe('pg');
    expect(knexfile.production.client).toBe('pg');
  });
});
