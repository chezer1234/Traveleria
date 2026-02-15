/**
 * Jest test setup — creates a Knex instance pointing at the test database,
 * runs migrations before all tests, and tears down afterward.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');
const knexfile = require('../src/db/knexfile');

const db = knex(knexfile.test);

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(true);
  await db.destroy();
});

module.exports = { db };
