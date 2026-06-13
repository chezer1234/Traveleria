import express from 'express';
import db from '../db/connection.js';
import { calculateTotalTravelPoints, calculateSubregionBonuses, getCountryTier } from '../lib/points.js';

const router = express.Router();

// Helper: load user travel data for points calculation
async function getUserTravelData(userId, homeCountryCode, allCountries, allProvincesMap) {
  const homeCountry = allCountries.find(c => c.code === (homeCountryCode || '').toUpperCase()) || null;

  const visitedRecords = await db('user_countries').where({ user_id: userId });

  const visitedCountries = [];
  for (const uc of visitedRecords) {
    const country = allCountries.find(c => c.code === uc.country_code);
    if (!country) continue;

    const tier = getCountryTier(country.code);

    const visitedCities = await db('user_cities')
      .join('cities', 'user_cities.city_id', 'cities.id')
      .where({ 'user_cities.user_id': userId, 'cities.country_code': country.code })
      .select('cities.id', 'cities.name', 'cities.population');

    const visitedProvinces = await db('user_provinces')
      .join('provinces', 'user_provinces.province_code', 'provinces.code')
      .where({ 'user_provinces.user_id': userId, 'provinces.country_code': country.code })
      .select('provinces.*');

    const allProvinces = allProvincesMap[country.code] || [];

    let allCities = [];
    if (tier === 1 || tier === 3) {
      allCities = await db('cities')
        .where({ country_code: country.code })
        .orderBy('population', 'desc');
    }

    visitedCountries.push({ country, visitedCities, visitedProvinces, allProvinces, allCities });
  }

  return { homeCountry, visitedCountries };
}

// GET /api/leaderboard — top 50 users ranked by total Travel Points
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    const users = await db('users');
    const allCountries = await db('countries')
      .select('code', 'name', 'region', 'subregion', 'population', 'annual_tourists', 'area_km2', 'lat', 'lng');

    // Pre-fetch all provinces grouped by country
    const allProvincesRaw = await db('provinces');
    const allProvincesMap = {};
    for (const p of allProvincesRaw) {
      if (!allProvincesMap[p.country_code]) allProvincesMap[p.country_code] = [];
      allProvincesMap[p.country_code].push(p);
    }

    // Subregion claims, keyed by user, so totals include claimed bonuses — the
    // client leaderboard (queries.js getLeaderboardLocal) does the same and the
    // two must agree to the cent (see parity.spec.js + issue #27).
    const allSubregionClaims = await db('user_subregions').select('user_id', 'subregion');
    const claimedByUser = {};
    for (const r of allSubregionClaims) {
      (claimedByUser[r.user_id] ||= new Set()).add(r.subregion);
    }

    const entries = [];
    for (const u of users) {
      const { homeCountry, visitedCountries } = await getUserTravelData(u.id, u.home_country, allCountries, allProvincesMap);
      const result = calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries);
      const visitedCodes = new Set(visitedCountries.map(v => v.country.code));
      const claimedSubregions = claimedByUser[u.id] || new Set();
      const { totalBonusPoints } = calculateSubregionBonuses(homeCountry, allCountries, visitedCodes, claimedSubregions);

      entries.push({
        user_id: u.id,
        identifier: u.identifier,
        home_country: u.home_country,
        total_points: Math.round((result.totalPoints + totalBonusPoints) * 100) / 100,
        countries_visited: visitedCountries.length,
      });
    }

    entries.sort((a, b) => b.total_points - a.total_points);
    entries.forEach((e, i) => { e.rank = i + 1; });

    const top50 = entries.slice(0, 50);

    if (user_id) {
      const inTop50 = top50.some(e => e.user_id === user_id);
      if (!inTop50) {
        const userEntry = entries.find(e => e.user_id === user_id);
        if (userEntry) {
          top50.push({ ...userEntry, current_user: true });
        }
      }
    }

    res.json(top50);
  } catch (err) {
    console.error('GET /leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
