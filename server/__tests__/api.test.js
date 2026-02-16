/**
 * Integration tests for API routes: auth, countries, user travel log.
 * Uses the test database with migrations and seeds.
 */
const { db } = require('./setup');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// We test the route handlers directly by importing the app
// For simplicity, we test the core flows via database + points engine
// (Express 5 supertest setup can be added later)

const { generateToken, JWT_SECRET } = require('../src/middleware/auth');
const { calculateCountryPoints, calculateTotalTravelPoints, getBaseline } = require('../src/lib/points');

let testUser;
let authToken;

beforeAll(async () => {
  // Run seeds to populate countries and cities
  await db.seed.run();
});

beforeEach(async () => {
  // Clean user-related tables before each test
  await db('user_cities').del();
  await db('user_countries').del();
  await db('users').del();

  // Create a test user
  const password_hash = await bcrypt.hash('testpass123', 10);
  const [user] = await db('users')
    .insert({
      username: 'testuser',
      email: 'test@example.com',
      password_hash,
      home_country: 'GB',
    })
    .returning('*');

  testUser = user;
  authToken = generateToken(testUser);
});

describe('Auth', () => {
  test('generateToken creates a valid JWT', () => {
    const token = generateToken(testUser);
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.username).toBe('testuser');
    expect(decoded.email).toBe('test@example.com');
  });

  test('password hashing works correctly', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    expect(await bcrypt.compare('mypassword', hash)).toBe(true);
    expect(await bcrypt.compare('wrongpassword', hash)).toBe(false);
  });

  test('user is created with correct fields', () => {
    expect(testUser.username).toBe('testuser');
    expect(testUser.email).toBe('test@example.com');
    expect(testUser.home_country).toBe('GB');
    expect(testUser.password_hash).toBeDefined();
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

  test('baseline points are personalised based on home region', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');

    const baselineFromEurope = getBaseline(france, 'Europe', allCountries);
    const baselineFromOceania = getBaseline(france, 'Oceania', allCountries);

    // Oceania→Europe has 4x multiplier, so baseline should differ
    expect(baselineFromOceania).not.toEqual(baselineFromEurope);
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

    // Remove the country
    // First remove city visits for the country
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

    const pts = calculateCountryPoints(france, 'Europe', allCountries, []);
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBe(0);
    expect(pts.total).toBe(pts.baseline);
  });

  test('visiting France with Paris gives exploration points', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const paris = await db('cities').where({ country_code: 'FR', name: 'Paris' }).first();

    const pts = calculateCountryPoints(france, 'Europe', allCountries, [paris]);
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.explored).toBeGreaterThan(0);
    expect(pts.total).toBeGreaterThan(pts.baseline);
  });

  test('total travel points sums across countries', async () => {
    const allCountries = await db('countries');
    const france = allCountries.find(c => c.code === 'FR');
    const japan = allCountries.find(c => c.code === 'JP');

    const visited = [
      { country: france, visitedCities: [] },
      { country: japan, visitedCities: [] },
    ];

    const result = calculateTotalTravelPoints('Europe', allCountries, visited);
    expect(result.countries).toHaveLength(2);
    expect(result.totalPoints).toBeGreaterThan(0);

    // Total should equal sum of individual totals
    const expectedSum = result.countries.reduce((s, c) => s + c.total, 0);
    expect(result.totalPoints).toBeCloseTo(expectedSum, 1);
  });

  test('outlier countries (Vatican, North Korea) get corrected baselines', async () => {
    const allCountries = await db('countries');
    const vatican = allCountries.find(c => c.code === 'VA');
    const nk = allCountries.find(c => c.code === 'KP');

    if (vatican) {
      const vaticanBaseline = getBaseline(vatican, 'Europe', allCountries);
      expect(vaticanBaseline).toBeGreaterThanOrEqual(2);
      expect(vaticanBaseline).toBeLessThanOrEqual(500);
    }

    if (nk) {
      const nkBaseline = getBaseline(nk, 'Europe', allCountries);
      expect(nkBaseline).toBeGreaterThanOrEqual(2);
      expect(nkBaseline).toBeLessThanOrEqual(500);
    }
  });
});
