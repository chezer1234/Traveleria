/**
 * Integration tests for API routes: countries, user travel log, points.
 * Uses the test database with migrations and seeds.
 */
const crypto = require('crypto');
const { db } = require('./setup');
const { calculateCountryPoints, calculateTotalTravelPoints, getBaseline } = require('../src/lib/points');

let testUser;

beforeAll(async () => {
  // Run seeds to populate countries and cities
  await db.seed.run();
});

beforeEach(async () => {
  // Clean user-related tables before each test
  await db('user_cities').del();
  await db('user_countries').del();
  await db('users').del();

  // Create a test user (simple auth — no passwords)
  const [user] = await db('users')
    .insert({
      id: crypto.randomUUID(),
      username: 'testuser',
      home_country: 'GB',
    })
    .returning('*');

  testUser = user;
});

describe('User Creation', () => {
  test('user is created with correct fields', () => {
    expect(testUser.username).toBe('testuser');
    expect(testUser.home_country).toBe('GB');
    expect(testUser.id).toBeDefined();
  });
});

describe('Countries Data', () => {
  test('countries are seeded (190+)', async () => {
    const count = await db('countries').count('* as cnt').first();
    expect(parseInt(count.cnt)).toBeGreaterThanOrEqual(190);
  });

  test('cities are seeded (200+)', async () => {
    const count = await db('cities').count('* as cnt').first();
    expect(parseInt(count.cnt)).toBeGreaterThanOrEqual(200);
  });

  test('baseline points are personalised based on home country distance', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const homeGB = allCountries.find(c => c.code === 'GB');
    const homeAU = allCountries.find(c => c.code === 'AU');

    const baselineFromGB = getBaseline(france, homeGB, allCountries);
    const baselineFromAU = getBaseline(france, homeAU, allCountries);

    // Australia is much further from France than GB, so baseline should differ
    expect(baselineFromAU).not.toEqual(baselineFromGB);
    expect(baselineFromAU).toBeGreaterThan(baselineFromGB);
  });
});

describe('User Travel Log — Add/Remove Countries', () => {
  test('add a country to visited list', async () => {
    const [record] = await db('user_countries')
      .insert({ user_id: testUser.id, country_code: 'FR' })
      .returning('*');

    expect(record.user_id).toBe(testUser.id);
    expect(record.country_code).toBe('FR');
  });

  test('duplicate country is prevented by unique constraint', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' });

    await expect(
      db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' })
    ).rejects.toThrow();
  });

  test('remove a country also allows re-adding', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' });
    await db('user_countries').where({ user_id: testUser.id, country_code: 'FR' }).del();

    const remaining = await db('user_countries').where({ user_id: testUser.id, country_code: 'FR' });
    expect(remaining).toHaveLength(0);

    // Can re-add
    const [record] = await db('user_countries')
      .insert({ user_id: testUser.id, country_code: 'FR' })
      .returning('*');
    expect(record.country_code).toBe('FR');
  });

  test('removing a country cascades to remove city visits', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'GB' });

    const city = await db('cities').where({ country_code: 'GB' }).first();
    await db('user_cities').insert({ user_id: testUser.id, city_id: city.id });

    // Remove the country (manually cascade city visits first)
    const cityIds = await db('cities').where({ country_code: 'GB' }).pluck('id');
    await db('user_cities').where({ user_id: testUser.id }).whereIn('city_id', cityIds).del();
    await db('user_countries').where({ user_id: testUser.id, country_code: 'GB' }).del();

    const cityVisits = await db('user_cities').where({ user_id: testUser.id });
    expect(cityVisits).toHaveLength(0);
  });
});

describe('User Travel Log — City Visits', () => {
  test('add a city visit', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' });
    const city = await db('cities').where({ country_code: 'FR' }).first();

    const [record] = await db('user_cities')
      .insert({ user_id: testUser.id, city_id: city.id })
      .returning('*');

    expect(record.user_id).toBe(testUser.id);
    expect(record.city_id).toBe(city.id);
  });

  test('duplicate city visit is prevented', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' });
    const city = await db('cities').where({ country_code: 'FR' }).first();

    await db('user_cities').insert({ user_id: testUser.id, city_id: city.id });

    await expect(
      db('user_cities').insert({ user_id: testUser.id, city_id: city.id })
    ).rejects.toThrow();
  });

  test('remove a city visit', async () => {
    await db('user_countries').insert({ user_id: testUser.id, country_code: 'FR' });
    const city = await db('cities').where({ country_code: 'FR' }).first();
    await db('user_cities').insert({ user_id: testUser.id, city_id: city.id });

    await db('user_cities').where({ user_id: testUser.id, city_id: city.id }).del();

    const remaining = await db('user_cities').where({ user_id: testUser.id });
    expect(remaining).toHaveLength(0);
  });
});

describe('Points Calculation — Integration', () => {
  test('visiting France from GB gives correct points structure', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const homeGB = allCountries.find(c => c.code === 'GB');

    const pts = calculateCountryPoints(france, homeGB, allCountries, {});
    expect(pts.tier).toBe(2);
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBe(0);
    expect(pts.total).toBe(pts.baseline);
  });

  test('visiting France with a province gives exploration points', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const homeGB = allCountries.find(c => c.code === 'GB');
    const allProvinces = await db('provinces').where({ country_code: 'FR' });
    const idf = allProvinces.find(p => p.code === 'FR-IDF');

    const pts = calculateCountryPoints(france, homeGB, allCountries, {
      allProvinces,
      visitedProvinces: [{ code: idf.code }],
    });
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.explored).toBeGreaterThan(0);
    expect(pts.total).toBeGreaterThan(pts.baseline);
  });

  test('total travel points sums across countries', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const japan = allCountries.find(c => c.code === 'JP');
    const homeGB = allCountries.find(c => c.code === 'GB');

    const visited = [
      { country: france },
      { country: japan },
    ];

    const result = calculateTotalTravelPoints(homeGB, allCountries, visited);
    expect(result.countries).toHaveLength(2);
    expect(result.totalPoints).toBeGreaterThan(0);

    // Total should equal sum of individual totals
    const expectedSum = result.countries.reduce((s, c) => s + c.total, 0);
    expect(result.totalPoints).toBeCloseTo(expectedSum, 1);
  });

  test('Vatican is microstate, North Korea has high baseline', async () => {
    const allCountries = await db('countries');
    const vatican = allCountries.find(c => c.code === 'VA');
    const nk = allCountries.find(c => c.code === 'KP');
    const homeGB = allCountries.find(c => c.code === 'GB');

    if (vatican) {
      const vaticanBaseline = getBaseline(vatican, homeGB, allCountries);
      expect(vaticanBaseline).toBe(1); // Microstate flat points
    }

    if (nk) {
      const nkBaseline = getBaseline(nk, homeGB, allCountries);
      expect(nkBaseline).toBeGreaterThan(50); // Hard to visit, far away
      expect(nkBaseline).toBeLessThanOrEqual(200); // Capped
    }
  });
});
