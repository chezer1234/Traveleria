const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { getBaseline, getCityPercentage } = require('../lib/points');

const router = express.Router();

// GET /api/countries — all countries with personalised baseline points
router.get('/', requireAuth, async (req, res) => {
  try {
    const allCountries = await db('countries').orderBy('name');

    // Get user's home region
    const user = await db('users').where({ id: req.user.id }).first();
    const homeCountry = allCountries.find(c => c.code === user.home_country);
    const homeRegion = homeCountry ? homeCountry.region : 'Europe';

    const result = allCountries.map(country => ({
      code: country.code,
      name: country.name,
      region: country.region,
      population: country.population,
      annual_tourists: country.annual_tourists,
      area_km2: country.area_km2,
      baseline_points: Math.round(getBaseline(country, homeRegion, allCountries) * 100) / 100,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /countries error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/countries/:code — single country detail with cities
router.get('/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const country = await db('countries').where({ code: code.toUpperCase() }).first();

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const allCountries = await db('countries');
    const user = await db('users').where({ id: req.user.id }).first();
    const homeCountry = allCountries.find(c => c.code === user.home_country);
    const homeRegion = homeCountry ? homeCountry.region : 'Europe';

    const cities = await db('cities').where({ country_code: country.code }).orderBy('population', 'desc');

    const citiesWithPercentage = cities.map(city => ({
      id: city.id,
      name: city.name,
      population: city.population,
      percentage: Math.round(getCityPercentage(city.population, country.population) * 10000) / 100,
    }));

    res.json({
      ...country,
      baseline_points: Math.round(getBaseline(country, homeRegion, allCountries) * 100) / 100,
      cities: citiesWithPercentage,
    });
  } catch (err) {
    console.error('GET /countries/:code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/countries/:code/cities — cities for a country with % contribution
router.get('/:code/cities', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const country = await db('countries').where({ code: code.toUpperCase() }).first();

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const cities = await db('cities').where({ country_code: country.code }).orderBy('population', 'desc');

    const result = cities.map(city => ({
      id: city.id,
      name: city.name,
      population: city.population,
      percentage: Math.round(getCityPercentage(city.population, country.population) * 10000) / 100,
    }));

    res.json(result);
  } catch (err) {
    console.error('GET /countries/:code/cities error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
