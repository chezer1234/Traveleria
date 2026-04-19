/**
 * Jest test setup — creates a Knex instance pointing at the test database,
 * runs migrations before all tests, and tears down afterward.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import knex from 'knex';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const knexfile = require('../src/db/knexfile.cjs');

export const db = knex(knexfile.test);

beforeAll(async () => {
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(true);
  await db.destroy();
});
