const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { calculateCountryPoints, calculateTotalTravelPoints } = require('../lib/points');

const SALT_ROUNDS = 10;

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

// GET /api/users/:id/profile — get user profile
router.get('/:id/profile', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await db('users')
      .where({ id })
      .select('id', 'username', 'email', 'avatar_url', 'home_country', 'created_at')
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('GET /users/:id/profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/profile — update username, avatar_url, home_country
router.put('/:id/profile', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { username, avatar_url, home_country } = req.body;
    const updates = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed || trimmed.length < 2) {
        return res.status(400).json({ error: 'Username must be at least 2 characters' });
      }
      if (trimmed.length > 30) {
        return res.status(400).json({ error: 'Username must be 30 characters or fewer' });
      }
      // Check uniqueness
      const existing = await db('users').where({ username: trimmed }).whereNot({ id }).first();
      if (existing) {
        return res.status(409).json({ error: 'That username is already taken' });
      }
      updates.username = trimmed;
    }

    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url || null;
    }

    if (home_country !== undefined) {
      if (home_country) {
        const country = await db('countries').where({ code: home_country.toUpperCase() }).first();
        if (!country) {
          return res.status(400).json({ error: 'Invalid home_country code' });
        }
        updates.home_country = country.code;
      } else {
        updates.home_country = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const [updated] = await db('users')
      .where({ id })
      .update(updates)
      .returning(['id', 'username', 'email', 'avatar_url', 'home_country', 'created_at']);

    res.json(updated);
  } catch (err) {
    console.error('PUT /users/:id/profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/password — change password
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await db('users').where({ id }).update({ password_hash });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /users/:id/password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
