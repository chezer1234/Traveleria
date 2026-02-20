const express = require('express');
const db = require('../db/connection');
const { calculateCountryPoints, calculateTotalTravelPoints } = require('../lib/points');

const router = express.Router();

// Ensure a user record exists for the given session ID, creating one if needed
async function ensureUser(id) {
  const existing = await db('users').where({ id }).first();
  if (existing) return existing;
  const [created] = await db('users').insert({ id }).returning('*');
  return created;
}

// Helper: load user travel data for points calculation
async function getUserTravelData(userId, homeCountryCode) {
  const allCountries = await db('countries');
  const homeCountry = allCountries.find(c => c.code === (homeCountryCode || '').toUpperCase());
  const homeRegion = homeCountry ? homeCountry.region : 'Europe';

  const visitedRecords = await db('user_countries').where({ user_id: userId });

  const visitedCountries = [];
  for (const uc of visitedRecords) {
    const country = allCountries.find(c => c.code === uc.country_code);
    if (!country) continue;

    const visitedCities = await db('user_cities')
      .join('cities', 'user_cities.city_id', 'cities.id')
      .where({ 'user_cities.user_id': userId, 'cities.country_code': country.code })
      .select('cities.id', 'cities.name', 'cities.population');

    visitedCountries.push({ country, visitedCities, visited_at: uc.visited_at });
  }

  return { homeRegion, allCountries, visitedCountries };
}

// POST /api/users/:id/countries — add a visited country
router.post('/:id/countries', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureUser(id);

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

// DELETE /api/users/:id/countries/:code — remove a visited country + cascade city visits
router.delete('/:id/countries/:code', async (req, res) => {
  try {
    const { id, code } = req.params;

    const uc = await db('user_countries')
      .where({ user_id: id, country_code: code.toUpperCase() })
      .first();

    if (!uc) {
      return res.status(404).json({ error: 'Country not in your visited list' });
    }

    const cityIds = await db('cities')
      .where({ country_code: code.toUpperCase() })
      .pluck('id');

    if (cityIds.length > 0) {
      await db('user_cities')
        .where({ user_id: id })
        .whereIn('city_id', cityIds)
        .del();
    }

    await db('user_countries')
      .where({ user_id: id, country_code: code.toUpperCase() })
      .del();

    res.json({ message: 'Country and associated city visits removed' });
  } catch (err) {
    console.error('DELETE /users/:id/countries/:code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/countries?home_country=XX — visited countries with points breakdown
router.get('/:id/countries', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureUser(id);

    const data = await getUserTravelData(id, req.query.home_country);
    const { homeRegion, allCountries, visitedCountries } = data;

    const result = visitedCountries.map(({ country, visitedCities, visited_at }) => {
      const pts = calculateCountryPoints(country, homeRegion, allCountries, visitedCities);
      return {
        country_code: country.code,
        country_name: country.name,
        region: country.region,
        visited_at,
        cities_visited: visitedCities.length,
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
    await ensureUser(id);

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

// GET /api/users/:id/score?home_country=XX — total Travel Points with per-country breakdown
router.get('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    await ensureUser(id);

    const data = await getUserTravelData(id, req.query.home_country);
    const { homeRegion, allCountries, visitedCountries } = data;
    const result = calculateTotalTravelPoints(homeRegion, allCountries, visitedCountries);

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
