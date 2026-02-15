/**
 * Tests that seed data loads correctly and contains expected values.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const knex = require('knex');
const knexfile = require('../src/db/knexfile');

let db;

beforeAll(async () => {
  db = knex(knexfile.test);
  await db.migrate.rollback(true);
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.migrate.rollback(true);
  await db.destroy();
});

describe('Seed Data — Countries', () => {
  test('loads at least 190 countries', async () => {
    const count = await db('countries').count('* as count').first();
    expect(parseInt(count.count, 10)).toBeGreaterThanOrEqual(190);
  });

  test('each country has all required fields populated', async () => {
    const countries = await db('countries').select('*');
    for (const c of countries) {
      expect(c.code).toBeTruthy();
      expect(c.code.length).toBe(2);
      expect(c.name).toBeTruthy();
      expect(c.region).toBeTruthy();
      expect(parseInt(c.population, 10)).toBeGreaterThan(0);
      expect(parseInt(c.annual_tourists, 10)).toBeGreaterThan(0);
      expect(c.area_km2).toBeGreaterThan(0);
    }
  });

  test('contains all expected regions', async () => {
    const regions = await db('countries').distinct('region').pluck('region');
    const expectedRegions = [
      'Europe',
      'Asia',
      'Africa',
      'North America',
      'South America',
      'Oceania',
      'Middle East',
    ];
    for (const region of expectedRegions) {
      expect(regions).toContain(region);
    }
  });

  test('contains well-known countries', async () => {
    const us = await db('countries').where({ code: 'US' }).first();
    expect(us).toBeDefined();
    expect(us.name).toBe('United States');
    expect(us.region).toBe('North America');

    const fr = await db('countries').where({ code: 'FR' }).first();
    expect(fr).toBeDefined();
    expect(fr.name).toBe('France');
    expect(fr.region).toBe('Europe');

    const jp = await db('countries').where({ code: 'JP' }).first();
    expect(jp).toBeDefined();
    expect(jp.name).toBe('Japan');
    expect(jp.region).toBe('Asia');

    const au = await db('countries').where({ code: 'AU' }).first();
    expect(au).toBeDefined();
    expect(au.name).toBe('Australia');
    expect(au.region).toBe('Oceania');
  });

  test('country codes are unique (no duplicates)', async () => {
    const codes = await db('countries').pluck('code');
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe('Seed Data — Cities', () => {
  test('loads at least 200 cities', async () => {
    const count = await db('cities').count('* as count').first();
    expect(parseInt(count.count, 10)).toBeGreaterThanOrEqual(200);
  });

  test('each city has all required fields populated', async () => {
    const cities = await db('cities').select('*');
    for (const city of cities) {
      expect(city.id).toBeTruthy();
      expect(city.country_code).toBeTruthy();
      expect(city.country_code.length).toBe(2);
      expect(city.name).toBeTruthy();
      expect(parseInt(city.population, 10)).toBeGreaterThan(0);
    }
  });

  test('all city country_codes reference existing countries', async () => {
    const cityCodes = await db('cities').distinct('country_code').pluck('country_code');
    const countryCodes = await db('countries').pluck('code');
    for (const code of cityCodes) {
      expect(countryCodes).toContain(code);
    }
  });

  test('contains cities for major countries', async () => {
    const countriesWithCities = await db('cities')
      .distinct('country_code')
      .pluck('country_code');

    // Expect cities for at least these countries
    expect(countriesWithCities).toContain('US');
    expect(countriesWithCities).toContain('GB');
    expect(countriesWithCities).toContain('FR');
    expect(countriesWithCities).toContain('DE');
    expect(countriesWithCities).toContain('JP');
    expect(countriesWithCities).toContain('AU');
    expect(countriesWithCities).toContain('BR');
    expect(countriesWithCities).toContain('IN');
    expect(countriesWithCities).toContain('CN');
  });

  test('city populations are less than their country populations', async () => {
    const cities = await db('cities')
      .join('countries', 'cities.country_code', 'countries.code')
      .select('cities.name as city_name', 'cities.population as city_pop', 'countries.population as country_pop');

    for (const row of cities) {
      expect(parseInt(row.city_pop, 10)).toBeLessThan(parseInt(row.country_pop, 10));
    }
  });

  test('well-known cities exist with correct country codes', async () => {
    const nyc = await db('cities').where({ name: 'New York City', country_code: 'US' }).first();
    expect(nyc).toBeDefined();

    const london = await db('cities').where({ name: 'London', country_code: 'GB' }).first();
    expect(london).toBeDefined();

    const tokyo = await db('cities').where({ name: 'Tokyo', country_code: 'JP' }).first();
    expect(tokyo).toBeDefined();

    const paris = await db('cities').where({ name: 'Paris', country_code: 'FR' }).first();
    expect(paris).toBeDefined();

    const sydney = await db('cities').where({ name: 'Sydney', country_code: 'AU' }).first();
    expect(sydney).toBeDefined();
  });
});

describe('Seed Data — Referential Integrity', () => {
  test('can insert a user with a seeded home_country', async () => {
    const [user] = await db('users')
      .insert({
        username: 'seedtest',
        email: 'seedtest@example.com',
        password_hash: 'hash',
        home_country: 'GB',
      })
      .returning('*');

    expect(user.username).toBe('seedtest');
    expect(user.home_country).toBe('GB');

    await db('users').where({ id: user.id }).del();
  });

  test('can insert a user_country visit with seeded data', async () => {
    const [user] = await db('users')
      .insert({
        username: 'visittest',
        email: 'visittest@example.com',
        password_hash: 'hash',
        home_country: 'US',
      })
      .returning('*');

    const [visit] = await db('user_countries')
      .insert({
        user_id: user.id,
        country_code: 'FR',
        visited_at: '2025-06-15',
      })
      .returning('*');

    expect(visit.user_id).toBe(user.id);
    expect(visit.country_code).toBe('FR');

    await db('user_countries').where({ id: visit.id }).del();
    await db('users').where({ id: user.id }).del();
  });

  test('can insert a user_city visit with seeded data', async () => {
    const [user] = await db('users')
      .insert({
        username: 'cityvisit',
        email: 'cityvisit@example.com',
        password_hash: 'hash',
        home_country: 'US',
      })
      .returning('*');

    // Log a visit to France first
    await db('user_countries').insert({
      user_id: user.id,
      country_code: 'FR',
    });

    // Get a city in France
    const paris = await db('cities').where({ name: 'Paris', country_code: 'FR' }).first();

    const [cityVisit] = await db('user_cities')
      .insert({
        user_id: user.id,
        city_id: paris.id,
        visited_at: '2025-07-01',
      })
      .returning('*');

    expect(cityVisit.user_id).toBe(user.id);
    expect(cityVisit.city_id).toBe(paris.id);

    // Cleanup
    await db('user_cities').where({ id: cityVisit.id }).del();
    await db('user_countries').where({ user_id: user.id }).del();
    await db('users').where({ id: user.id }).del();
  });

  test('cascade delete: removing a user removes their country and city visits', async () => {
    const [user] = await db('users')
      .insert({
        username: 'cascadetest',
        email: 'cascade@example.com',
        password_hash: 'hash',
        home_country: 'US',
      })
      .returning('*');

    await db('user_countries').insert({
      user_id: user.id,
      country_code: 'JP',
    });

    const tokyo = await db('cities').where({ name: 'Tokyo', country_code: 'JP' }).first();
    await db('user_cities').insert({
      user_id: user.id,
      city_id: tokyo.id,
    });

    // Delete the user
    await db('users').where({ id: user.id }).del();

    // Visits should be cascade-deleted
    const countryVisits = await db('user_countries').where({ user_id: user.id });
    expect(countryVisits).toHaveLength(0);

    const cityVisits = await db('user_cities').where({ user_id: user.id });
    expect(cityVisits).toHaveLength(0);
  });
});
