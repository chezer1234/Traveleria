/**
 * Tests that all database migrations create the correct tables and columns.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');
const knexfile = require('../src/db/knexfile');

let db;

beforeAll(async () => {
  db = knex(knexfile.test);
  // Roll back everything first for a clean slate
  await db.migrate.rollback(true);
  await db.migrate.latest();
});

afterAll(async () => {
  await db.migrate.rollback(true);
  await db.destroy();
});

describe('Database Migrations', () => {
  test('countries table exists with correct columns', async () => {
    const hasTable = await db.schema.hasTable('countries');
    expect(hasTable).toBe(true);

    const columns = await db.table('countries').columnInfo();
    expect(columns).toHaveProperty('code');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('region');
    expect(columns).toHaveProperty('population');
    expect(columns).toHaveProperty('annual_tourists');
    expect(columns).toHaveProperty('area_km2');
  });

  test('cities table exists with correct columns', async () => {
    const hasTable = await db.schema.hasTable('cities');
    expect(hasTable).toBe(true);

    const columns = await db.table('cities').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('country_code');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('population');
  });

  test('users table exists with correct columns', async () => {
    const hasTable = await db.schema.hasTable('users');
    expect(hasTable).toBe(true);

    const columns = await db.table('users').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('username');
    expect(columns).toHaveProperty('email');
    expect(columns).toHaveProperty('password_hash');
    expect(columns).toHaveProperty('avatar_url');
    expect(columns).toHaveProperty('home_country');
    expect(columns).toHaveProperty('created_at');
  });

  test('user_countries table exists with correct columns', async () => {
    const hasTable = await db.schema.hasTable('user_countries');
    expect(hasTable).toBe(true);

    const columns = await db.table('user_countries').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('user_id');
    expect(columns).toHaveProperty('country_code');
    expect(columns).toHaveProperty('visited_at');
    expect(columns).toHaveProperty('created_at');
  });

  test('user_cities table exists with correct columns', async () => {
    const hasTable = await db.schema.hasTable('user_cities');
    expect(hasTable).toBe(true);

    const columns = await db.table('user_cities').columnInfo();
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('user_id');
    expect(columns).toHaveProperty('city_id');
    expect(columns).toHaveProperty('visited_at');
    expect(columns).toHaveProperty('created_at');
  });

  test('countries.code is a primary key', async () => {
    // Insert a country then try to insert a duplicate — should fail
    await db('countries').insert({
      code: 'ZZ',
      name: 'Test Country',
      region: 'Test',
      population: 1000,
      annual_tourists: 100,
      area_km2: 500,
    });

    await expect(
      db('countries').insert({
        code: 'ZZ',
        name: 'Duplicate Country',
        region: 'Test',
        population: 2000,
        annual_tourists: 200,
        area_km2: 1000,
      })
    ).rejects.toThrow();

    await db('countries').where({ code: 'ZZ' }).del();
  });

  test('cities.country_code references countries.code', async () => {
    // Attempt to insert a city with non-existent country_code — should fail
    await expect(
      db('cities').insert({
        country_code: 'QQ',
        name: 'Ghost City',
        population: 1000,
      })
    ).rejects.toThrow();
  });

  test('users.home_country references countries.code', async () => {
    // Insert a valid country first
    await db('countries').insert({
      code: 'ZZ',
      name: 'Test Country',
      region: 'Test',
      population: 1000,
      annual_tourists: 100,
      area_km2: 500,
    });

    // Insert user with valid home_country
    const [user] = await db('users')
      .insert({
        username: 'testuser_fk',
        email: 'testfk@example.com',
        password_hash: 'hash',
        home_country: 'ZZ',
      })
      .returning('*');
    expect(user.home_country).toBe('ZZ');

    // Insert user with invalid home_country — should fail
    await expect(
      db('users').insert({
        username: 'baduser',
        email: 'bad@example.com',
        password_hash: 'hash',
        home_country: 'QQ',
      })
    ).rejects.toThrow();

    // Cleanup
    await db('users').where({ username: 'testuser_fk' }).del();
    await db('countries').where({ code: 'ZZ' }).del();
  });

  test('user_countries has unique constraint on (user_id, country_code)', async () => {
    // Setup: insert a country and user
    await db('countries').insert({
      code: 'ZZ',
      name: 'Test Country',
      region: 'Test',
      population: 1000,
      annual_tourists: 100,
      area_km2: 500,
    });
    const [user] = await db('users')
      .insert({
        username: 'uniquetest',
        email: 'unique@example.com',
        password_hash: 'hash',
        home_country: 'ZZ',
      })
      .returning('*');

    // First insert should succeed
    await db('user_countries').insert({
      user_id: user.id,
      country_code: 'ZZ',
    });

    // Duplicate should fail
    await expect(
      db('user_countries').insert({
        user_id: user.id,
        country_code: 'ZZ',
      })
    ).rejects.toThrow();

    // Cleanup
    await db('user_countries').where({ user_id: user.id }).del();
    await db('users').where({ id: user.id }).del();
    await db('countries').where({ code: 'ZZ' }).del();
  });

  test('migrations can be rolled back and re-applied', async () => {
    await db.migrate.rollback(true);

    const hasCountries = await db.schema.hasTable('countries');
    expect(hasCountries).toBe(false);

    await db.migrate.latest();

    const hasCountriesAgain = await db.schema.hasTable('countries');
    expect(hasCountriesAgain).toBe(true);
  });
});
