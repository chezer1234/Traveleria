const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const { calculateCountryPoints, calculateTotalTravelPoints, getCountryTier } = require('../lib/points');

const router = express.Router();

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// POST /api/users — create or find user by username
router.post('/', async (req, res) => {
  try {
    const { username, home_country } = req.body;

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        error: 'Username is required (3-30 characters, letters/numbers/underscores only)',
      });
    }

    if (!home_country || typeof home_country !== 'string' || home_country.length !== 2) {
      return res.status(400).json({ error: 'home_country must be a 2-character country code' });
    }

    // Try to find existing user (case-insensitive)
    const existing = await db('users')
      .whereRaw('LOWER(username) = ?', [username.toLowerCase()])
      .first();

    if (existing) {
      return res.status(200).json({
        id: existing.id,
        username: existing.username,
        home_country: existing.home_country,
        created_at: existing.created_at,
      });
    }

    // Create new user
    const [created] = await db('users')
      .insert({
        id: crypto.randomUUID(),
        username,
        home_country: home_country.toUpperCase(),
      })
      .returning(['id', 'username', 'home_country', 'created_at']);

    res.status(201).json(created);
  } catch (err) {
    console.error('POST /users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id — get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      username: user.username,
      home_country: user.home_country,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error('GET /users/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: load user travel data for points calculation
async function getUserTravelData(userId, homeCountryCode) {
  const allCountries = await db('countries');
  const homeCountry = allCountries.find(c => c.code === (homeCountryCode || '').toUpperCase());
  // Pass the full home country object for distance-based calculation
  // Falls back to null if not found (points.js handles this with a default multiplier)

  // Pre-fetch all provinces (only ~900 rows, cheaper than per-country queries)
  const allProvincesRaw = await db('provinces');
  const provincesByCountry = {};
  for (const p of allProvincesRaw) {
    if (!provincesByCountry[p.country_code]) provincesByCountry[p.country_code] = [];
    provincesByCountry[p.country_code].push(p);
  }

  const visitedRecords = await db('user_countries').where({ user_id: userId });

  const visitedCountries = [];
  for (const uc of visitedRecords) {
    const country = allCountries.find(c => c.code === uc.country_code);
    if (!country) continue;

    const tier = getCountryTier(country.code);

    // Fetch visited cities for this country
    const visitedCities = await db('user_cities')
      .join('cities', 'user_cities.city_id', 'cities.id')
      .where({ 'user_cities.user_id': userId, 'cities.country_code': country.code })
      .select('cities.id', 'cities.name', 'cities.population');

    // Fetch visited provinces for this country
    const visitedProvinces = await db('user_provinces')
      .join('provinces', 'user_provinces.province_code', 'provinces.code')
      .where({ 'user_provinces.user_id': userId, 'provinces.country_code': country.code })
      .select('provinces.*');

    // All provinces for this country (from pre-fetched cache)
    const allProvinces = provincesByCountry[country.code] || [];

    // All cities for this country (needed for Tier 1 city bonus & Tier 3 top-15)
    let allCities = [];
    if (tier === 1 || tier === 3) {
      allCities = await db('cities')
        .where({ country_code: country.code })
        .orderBy('population', 'desc');
    }

    visitedCountries.push({
      country,
      visitedCities,
      visitedProvinces,
      allProvinces,
      allCities,
      visited_at: uc.visited_at,
    });
  }

  return { homeCountry, allCountries, visitedCountries };
}

// POST /api/users/:id/countries — add a visited country
router.post('/:id/countries', async (req, res) => {
  try {
    const { id } = req.params;

    const { country_code, visited_at } = req.body;
    if (!country_code) {
      return res.status(400).json({ error: 'country_code is required' });
    }

    const country = await db('countries').where({ code: country_code.toUpperCase() }).first();
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const existing = await db('user_countries')
      .where({ user_id: id, country_code: country.code })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Country already added' });
    }

    const [record] = await db('user_countries')
      .insert({
        id: crypto.randomUUID(),
        user_id: id,
        country_code: country.code,
        visited_at: visited_at || null,
      })
      .returning('*');

    res.status(201).json(record);
  } catch (err) {
    console.error('POST /users/:id/countries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/countries/:code — remove a visited country + cascade city/province visits
router.delete('/:id/countries/:code', async (req, res) => {
  try {
    const { id, code } = req.params;
    const upperCode = code.toUpperCase();

    const uc = await db('user_countries')
      .where({ user_id: id, country_code: upperCode })
      .first();

    if (!uc) {
      return res.status(404).json({ error: 'Country not in your visited list' });
    }

    // Cascade: remove city visits
    const cityIds = await db('cities').where({ country_code: upperCode }).pluck('id');
    if (cityIds.length > 0) {
      await db('user_cities').where({ user_id: id }).whereIn('city_id', cityIds).del();
    }

    // Cascade: remove province visits
    const provinceCodes = await db('provinces').where({ country_code: upperCode }).pluck('code');
    if (provinceCodes.length > 0) {
      await db('user_provinces').where({ user_id: id }).whereIn('province_code', provinceCodes).del();
    }

    await db('user_countries').where({ user_id: id, country_code: upperCode }).del();

    res.json({ message: 'Country and associated city/province visits removed' });
  } catch (err) {
    console.error('DELETE /users/:id/countries/:code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/countries?home_country=XX — visited countries with points breakdown
router.get('/:id/countries', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await getUserTravelData(id, req.query.home_country);
    const { homeCountry, allCountries, visitedCountries } = data;

    const result = visitedCountries.map(({ country, visitedCities, visitedProvinces, allProvinces, allCities, visited_at }) => {
      const pts = calculateCountryPoints(country, homeCountry, allCountries, {
        visitedProvinces,
        visitedCities,
        allProvinces,
        allCities,
      });
      return {
        country_code: country.code,
        country_name: country.name,
        region: country.region,
        visited_at,
        cities_visited: visitedCities.length,
        provinces_visited: visitedProvinces.length,
        ...pts,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('GET /users/:id/countries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/cities — log a city visit
router.post('/:id/cities', async (req, res) => {
  try {
    const { id } = req.params;

    const { city_id, visited_at } = req.body;
    if (!city_id) {
      return res.status(400).json({ error: 'city_id is required' });
    }

    const city = await db('cities').where({ id: city_id }).first();
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    const hasCountry = await db('user_countries')
      .where({ user_id: id, country_code: city.country_code })
      .first();
    if (!hasCountry) {
      return res.status(400).json({ error: 'You must add the country before logging city visits' });
    }

    const existing = await db('user_cities')
      .where({ user_id: id, city_id })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'City already logged' });
    }

    const [record] = await db('user_cities')
      .insert({
        id: crypto.randomUUID(),
        user_id: id,
        city_id,
        visited_at: visited_at || null,
      })
      .returning('*');

    res.status(201).json(record);
  } catch (err) {
    console.error('POST /users/:id/cities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/cities/:cityId — remove a city visit
router.delete('/:id/cities/:cityId', async (req, res) => {
  try {
    const { id, cityId } = req.params;

    const deleted = await db('user_cities')
      .where({ user_id: id, city_id: cityId })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'City visit not found' });
    }

    res.json({ message: 'City visit removed' });
  } catch (err) {
    console.error('DELETE /users/:id/cities/:cityId error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/:id/provinces — log a province visit
router.post('/:id/provinces', async (req, res) => {
  try {
    const { id } = req.params;
    const { province_code, visited_at } = req.body;

    if (!province_code) {
      return res.status(400).json({ error: 'province_code is required' });
    }

    const province = await db('provinces').where({ code: province_code }).first();
    if (!province) {
      return res.status(404).json({ error: 'Province not found' });
    }

    const hasCountry = await db('user_countries')
      .where({ user_id: id, country_code: province.country_code })
      .first();
    if (!hasCountry) {
      return res.status(400).json({ error: 'You must add the country before logging province visits' });
    }

    const existing = await db('user_provinces')
      .where({ user_id: id, province_code })
      .first();
    if (existing) {
      return res.status(409).json({ error: 'Province already logged' });
    }

    const [record] = await db('user_provinces')
      .insert({
        id: crypto.randomUUID(),
        user_id: id,
        province_code,
        visited_at: visited_at || null,
      })
      .returning('*');

    res.status(201).json(record);
  } catch (err) {
    console.error('POST /users/:id/provinces error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id/provinces/:code — remove a province visit
router.delete('/:id/provinces/:code', async (req, res) => {
  try {
    const { id, code } = req.params;

    const deleted = await db('user_provinces')
      .where({ user_id: id, province_code: code })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Province visit not found' });
    }

    res.json({ message: 'Province visit removed' });
  } catch (err) {
    console.error('DELETE /users/:id/provinces/:code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/provinces — user's visited provinces
router.get('/:id/provinces', async (req, res) => {
  try {
    const { id } = req.params;

    const visited = await db('user_provinces')
      .join('provinces', 'user_provinces.province_code', 'provinces.code')
      .where({ 'user_provinces.user_id': id })
      .select('provinces.*', 'user_provinces.visited_at');

    res.json(visited);
  } catch (err) {
    console.error('GET /users/:id/provinces error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/score?home_country=XX — total Travel Points with per-country breakdown
router.get('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;

    const data = await getUserTravelData(id, req.query.home_country);
    const { homeCountry, allCountries, visitedCountries } = data;
    const result = calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries);

    res.json({
      user_id: id,
      ...result,
    });
  } catch (err) {
    console.error('GET /users/:id/score error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
