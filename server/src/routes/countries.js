import express from 'express';
import db from '../db/connection.js';
import {
  getBaseline,
  getCityPercentage,
  getCountryTier,
  getExplorerCeiling,
  getScoreBreakdown,
} from '../lib/points.js';

const router = express.Router();

// GET /api/countries?home_country=XX — all countries with baseline points
// Without home_country, returns just the country list (fast, no scoring)
router.get('/', async (req, res) => {
  const t0 = Date.now();
  try {
    console.log('[countries] Starting query...');
    const allCountries = await db('countries')
      .select('code', 'name', 'region', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng')
      .orderBy('name');
    console.log(`[countries] Query done: ${allCountries.length} rows in ${Date.now() - t0}ms`);

    const homeCountryCode = (req.query.home_country || '').toUpperCase();
    const homeCountry = allCountries.find(c => c.code === homeCountryCode);

    const result = allCountries.map(country => ({
      code: country.code,
      name: country.name,
      region: country.region,
      population: country.population,
      annual_tourists: country.annual_tourists,
      area_km2: country.area_km2,
      baseline_points: homeCountry
        ? Math.round(getBaseline(country, homeCountry, allCountries) * 100) / 100
        : 0,
    }));

    console.log(`[countries] Sending ${result.length} countries (${Date.now() - t0}ms total)`);
    res.json(result);
    console.log(`[countries] Response sent (${Date.now() - t0}ms)`);
  } catch (err) {
    console.error(`[countries] ERROR after ${Date.now() - t0}ms:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/countries/:code?home_country=XX — single country detail with cities + breakdown
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const country = await db('countries').where({ code: code.toUpperCase() }).first();

    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const allCountries = await db('countries')
      .select('code', 'name', 'region', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng');
    const homeCountryCode = (req.query.home_country || '').toUpperCase();
    const homeCountry = allCountries.find(c => c.code === homeCountryCode);

    const tier = getCountryTier(country.code);
    const baseline = getBaseline(country, homeCountry, allCountries);
    const explorerCeiling = getExplorerCeiling(baseline, country, allCountries);

    const cities = await db('cities').where({ country_code: country.code }).orderBy('population', 'desc');
    const citiesWithPercentage = cities.map(city => ({
      id: city.id,
      name: city.name,
      population: city.population,
      percentage: Math.round(getCityPercentage(city.population, country.population) * 10000) / 100,
    }));

    // Include provinces for Tier 1 & 2 countries
    let provinces = [];
    if (tier === 1 || tier === 2) {
      const rawProvinces = await db('provinces').where({ country_code: country.code }).orderBy('population', 'desc');
      const nationalPop = Number(country.population) || 1;
      provinces = rawProvinces.map(p => ({
        code: p.code,
        name: p.name,
        population: p.population,
        area_km2: p.area_km2,
        disputed: p.disputed,
        maxPoints: Math.round(((Number(p.population) / nationalPop) * explorerCeiling) * 100) / 100,
      }));
    }

    // Score breakdown for transparency UI
    const explorationDetail = {};
    if (tier === 1 || tier === 2) {
      explorationDetail.total = provinces.length;
      explorationDetail.visited = 0; // Will be populated per-user on the frontend
    } else if (tier !== 'microstate') {
      explorationDetail.total = Math.min(cities.length, 15);
      explorationDetail.visited = 0;
    }

    const breakdown = getScoreBreakdown(
      country, homeCountry, allCountries,
      explorerCeiling, 0, explorationDetail,
    );

    res.json({
      ...country,
      tier,
      baseline_points: Math.round(baseline * 100) / 100,
      explorer_ceiling: Math.round(explorerCeiling * 100) / 100,
      cities: citiesWithPercentage,
      provinces,
      breakdown,
    });
  } catch (err) {
    console.error('GET /countries/:code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/countries/:code/cities — cities for a country with % contribution
router.get('/:code/cities', async (req, res) => {
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

export default router;
