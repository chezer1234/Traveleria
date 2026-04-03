const express = require('express');
const db = require('../db/connection');
const { calculateTotalTravelPoints } = require('../lib/points');

const router = express.Router();

// Helper: load user travel data for points calculation (same pattern as users.js)
async function getUserTravelData(userId, homeCountryCode, allCountries) {
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

    visitedCountries.push({ country, visitedCities });
  }

  return { homeRegion, visitedCountries };
}

// GET /api/leaderboard — top 50 users ranked by total Travel Points
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    const users = await db('users');
    const allCountries = await db('countries');

    // Calculate points for every user
    const entries = [];
    for (const u of users) {
      const { homeRegion, visitedCountries } = await getUserTravelData(u.id, u.home_country, allCountries);
      const result = calculateTotalTravelPoints(homeRegion, allCountries, visitedCountries);

      entries.push({
        user_id: u.id,
        username: u.username,
        home_country: u.home_country,
        total_points: result.totalPoints,
        countries_visited: visitedCountries.length,
      });
    }

    // Sort by total_points descending
    entries.sort((a, b) => b.total_points - a.total_points);

    // Assign ranks
    entries.forEach((e, i) => {
      e.rank = i + 1;
    });

    // Top 50
    const top50 = entries.slice(0, 50);

    // If user_id provided and not in top 50, append them
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

module.exports = router;
