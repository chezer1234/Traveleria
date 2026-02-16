const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { calculateCountryPoints, calculateTotalTravelPoints } = require('../lib/points');

const router = express.Router();

// Helper: load user travel data for points calculation
async function getUserTravelData(userId) {
  const user = await db('users').where({ id: userId }).first();
  if (!user) return null;

  const allCountries = await db('countries');
  const homeCountry = allCountries.find(c => c.code === user.home_country);
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

  return { user, homeRegion, allCountries, visitedCountries };
}

// POST /api/users/:id/countries — add a visited country
router.post('/:id/countries', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { country_code, visited_at } = req.body;
    if (!country_code) {
      return res.status(400).json({ error: 'country_code is required' });
    }

    const country = await db('countries').where({ code: country_code.toUpperCase() }).first();
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    // Duplicate prevention
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
router.delete('/:id/countries/:code', requireAuth, async (req, res) => {
  try {
    const { id, code } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const uc = await db('user_countries')
      .where({ user_id: id, country_code: code.toUpperCase() })
      .first();

    if (!uc) {
      return res.status(404).json({ error: 'Country not in your visited list' });
    }

    // Remove city visits for this country first
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

// GET /api/users/:id/countries — visited countries with points breakdown
router.get('/:id/countries', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const data = await getUserTravelData(id);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

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
router.post('/:id/cities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { city_id, visited_at } = req.body;
    if (!city_id) {
      return res.status(400).json({ error: 'city_id is required' });
    }

    // Validate city exists
    const city = await db('cities').where({ id: city_id }).first();
    if (!city) {
      return res.status(404).json({ error: 'City not found' });
    }

    // Validate user has visited the country
    const hasCountry = await db('user_countries')
      .where({ user_id: id, country_code: city.country_code })
      .first();
    if (!hasCountry) {
      return res.status(400).json({ error: 'You must add the country before logging city visits' });
    }

    // Duplicate prevention
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
router.delete('/:id/cities/:cityId', requireAuth, async (req, res) => {
  try {
    const { id, cityId } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

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

// GET /api/users/:id/score — total Travel Points with per-country breakdown
router.get('/:id/score', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const data = await getUserTravelData(id);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

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
