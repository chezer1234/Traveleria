// Client-side data access. Replaces the five server GETs that the old
// api/client deleted (countries list, country detail, user countries, user
// score, leaderboard). Everything here reads from the synced local SQLite DB
// and scores via client/src/lib/points.js — no network on the read path.
//
// `db` in every signature is the entry returned by openUserDb (see db/local).

import {
  calculateCountryPoints,
  calculateTotalTravelPoints,
  getBaseline,
  getCountryTier,
  getExplorerCeiling,
  getCityPercentage,
  getScoreBreakdown,
} from './points.js';

// Country columns we always want when we pass a row into points.js. Kept in
// one place so a schema addition only requires one touch.
const COUNTRY_COLS = 'code, name, region, population, annual_tourists, area_km2, lat, lng';

async function loadAllCountries(db) {
  return db.all(`SELECT ${COUNTRY_COLS} FROM countries ORDER BY name`);
}

async function loadAllProvincesByCountry(db) {
  const rows = await db.all(`SELECT * FROM provinces`);
  const byCountry = {};
  for (const p of rows) {
    (byCountry[p.country_code] ||= []).push(p);
  }
  return byCountry;
}

async function loadCitiesForCountry(db, code) {
  return db.all(
    `SELECT id, name, population FROM cities WHERE country_code = ? ORDER BY population DESC`,
    [code],
  );
}

// ---------- Per-user travel data ----------

// Mirrors getUserTravelData on the server (server/src/routes/users.js).
async function getUserTravelData(db, userId, homeCountryCode) {
  const [allCountries, provincesByCountry] = await Promise.all([
    loadAllCountries(db),
    loadAllProvincesByCountry(db),
  ]);
  const home = allCountries.find((c) => c.code === (homeCountryCode || '').toUpperCase()) || null;

  const visitedRecords = await db.all(
    `SELECT * FROM user_countries WHERE user_id = ?`,
    [userId],
  );

  const visitedCountries = [];
  for (const uc of visitedRecords) {
    const country = allCountries.find((c) => c.code === uc.country_code);
    if (!country) continue;

    const tier = getCountryTier(country.code);

    const visitedCities = await db.all(
      `SELECT cities.id, cities.name, cities.population
         FROM user_cities
         JOIN cities ON user_cities.city_id = cities.id
         WHERE user_cities.user_id = ? AND cities.country_code = ?`,
      [userId, country.code],
    );

    const visitedProvinces = await db.all(
      `SELECT provinces.*
         FROM user_provinces
         JOIN provinces ON user_provinces.province_code = provinces.code
         WHERE user_provinces.user_id = ? AND provinces.country_code = ?`,
      [userId, country.code],
    );

    const allProvinces = provincesByCountry[country.code] || [];
    const allCities = (tier === 1 || tier === 3) ? await loadCitiesForCountry(db, country.code) : [];

    visitedCountries.push({
      country,
      visitedCities,
      visitedProvinces,
      allProvinces,
      allCities,
      visited_at: uc.visited_at,
    });
  }

  return { homeCountry: home, allCountries, visitedCountries };
}

// Dashboard + Map: the user's countries with per-country computed points.
// Matches GET /api/users/:id/countries?home_country=... response shape.
export async function getUserCountriesLocal(db, userId, homeCountryCode) {
  const { homeCountry, allCountries, visitedCountries } = await getUserTravelData(
    db, userId, homeCountryCode,
  );

  return visitedCountries.map(({ country, visitedCities, visitedProvinces, allProvinces, allCities, visited_at }) => {
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
}

// Dashboard + Map: the user's total Travel Points. Matches GET /:id/score.
export async function getUserScoreLocal(db, userId, homeCountryCode) {
  const { homeCountry, allCountries, visitedCountries } = await getUserTravelData(
    db, userId, homeCountryCode,
  );
  const result = calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries);
  return { user_id: userId, ...result };
}

// ---------- Country list (AddCountries, SignUp precedent) ----------

// Matches GET /api/countries?home_country=... response shape.
export async function getCountriesLocal(db, homeCountryCode) {
  const allCountries = await loadAllCountries(db);
  const home = homeCountryCode
    ? allCountries.find((c) => c.code === homeCountryCode.toUpperCase())
    : null;

  return allCountries.map((country) => ({
    code: country.code,
    name: country.name,
    region: country.region,
    population: country.population,
    annual_tourists: country.annual_tourists,
    area_km2: country.area_km2,
    baseline_points: home
      ? Math.round(getBaseline(country, home, allCountries) * 100) / 100
      : 0,
  }));
}

// ---------- Country detail (CountryDetail page) ----------

// Matches GET /api/countries/:code response shape, including breakdown.
export async function getCountryLocal(db, code, homeCountryCode) {
  const upperCode = code.toUpperCase();
  const country = await db.get(`SELECT * FROM countries WHERE code = ?`, [upperCode]);
  if (!country) return null;

  const allCountries = await loadAllCountries(db);
  const home = homeCountryCode
    ? allCountries.find((c) => c.code === homeCountryCode.toUpperCase())
    : null;

  const tier = getCountryTier(country.code);
  const baseline = getBaseline(country, home, allCountries);
  const explorerCeiling = getExplorerCeiling(baseline, country, allCountries);

  const cities = await loadCitiesForCountry(db, country.code);
  const citiesWithPercentage = cities.map((city) => ({
    id: city.id,
    name: city.name,
    population: city.population,
    percentage: Math.round(getCityPercentage(city.population, country.population) * 10000) / 100,
  }));

  let provinces = [];
  if (tier === 1 || tier === 2) {
    const rawProvinces = await db.all(
      `SELECT * FROM provinces WHERE country_code = ? ORDER BY population DESC`,
      [country.code],
    );
    const nationalPop = Number(country.population) || 1;
    provinces = rawProvinces.map((p) => ({
      code: p.code,
      name: p.name,
      population: p.population,
      area_km2: p.area_km2,
      disputed: p.disputed,
      maxPoints: Math.round(((Number(p.population) / nationalPop) * explorerCeiling) * 100) / 100,
    }));
  }

  const explorationDetail = {};
  if (tier === 1 || tier === 2) {
    explorationDetail.total = provinces.length;
    explorationDetail.visited = 0;
  } else if (tier !== 'microstate') {
    explorationDetail.total = Math.min(cities.length, 15);
    explorationDetail.visited = 0;
  }

  const breakdown = getScoreBreakdown(
    country, home, allCountries,
    explorerCeiling, 0, explorationDetail,
  );

  return {
    ...country,
    tier,
    baseline_points: Math.round(baseline * 100) / 100,
    explorer_ceiling: Math.round(explorerCeiling * 100) / 100,
    cities: citiesWithPercentage,
    provinces,
    breakdown,
  };
}

// Country-detail helpers: whether the signed-in user has visited this country
// and which cities/provinces inside it they've logged. Folded into one call to
// avoid three sequential awaits.
export async function getUserStatusForCountry(db, userId, code) {
  const upperCode = code.toUpperCase();
  const [uc, cityIds, provinceCodes] = await Promise.all([
    db.get(
      `SELECT id FROM user_countries WHERE user_id = ? AND country_code = ?`,
      [userId, upperCode],
    ),
    db.all(
      `SELECT uc.city_id AS city_id FROM user_cities uc
         JOIN cities c ON c.id = uc.city_id
         WHERE uc.user_id = ? AND c.country_code = ?`,
      [userId, upperCode],
    ),
    db.all(
      `SELECT up.province_code AS province_code FROM user_provinces up
         JOIN provinces p ON p.code = up.province_code
         WHERE up.user_id = ? AND p.country_code = ?`,
      [userId, upperCode],
    ),
  ]);
  return {
    isVisited: !!uc,
    visitedCityIds: new Set((cityIds || []).map((r) => r.city_id)),
    visitedProvinceCodes: new Set((provinceCodes || []).map((r) => r.province_code)),
  };
}

// ---------- Leaderboard ----------

// Matches GET /api/leaderboard?user_id=... shape — entries sorted by total
// points DESC. If the signed-in user isn't in the top 50, we append them
// tagged with current_user: true, same as the old server behaviour.
export async function getLeaderboardLocal(db, currentUserId) {
  const users = await db.all(
    `SELECT id, identifier, home_country FROM users_public`,
  );
  const allCountries = await loadAllCountries(db);
  const provincesByCountry = await loadAllProvincesByCountry(db);

  // Preload user-country rows keyed by user_id so we don't hit the DB 195×N
  // times. Provinces/cities stay per-country because the joins are cheap and
  // most users visit few countries.
  const allVisits = await db.all(`SELECT * FROM user_countries`);
  const visitsByUser = {};
  for (const v of allVisits) (visitsByUser[v.user_id] ||= []).push(v);

  const entries = [];
  for (const u of users) {
    const home = allCountries.find((c) => c.code === (u.home_country || '').toUpperCase()) || null;
    const visits = visitsByUser[u.id] || [];

    const visitedCountries = [];
    for (const uc of visits) {
      const country = allCountries.find((c) => c.code === uc.country_code);
      if (!country) continue;
      const tier = getCountryTier(country.code);
      const visitedCities = await db.all(
        `SELECT c.id, c.name, c.population FROM user_cities uc
           JOIN cities c ON c.id = uc.city_id
           WHERE uc.user_id = ? AND c.country_code = ?`,
        [u.id, country.code],
      );
      const visitedProvinces = await db.all(
        `SELECT p.* FROM user_provinces up
           JOIN provinces p ON p.code = up.province_code
           WHERE up.user_id = ? AND p.country_code = ?`,
        [u.id, country.code],
      );
      const allProvinces = provincesByCountry[country.code] || [];
      const allCities = (tier === 1 || tier === 3) ? await loadCitiesForCountry(db, country.code) : [];
      visitedCountries.push({ country, visitedCities, visitedProvinces, allProvinces, allCities });
    }

    const result = calculateTotalTravelPoints(home, allCountries, visitedCountries);
    entries.push({
      user_id: u.id,
      identifier: u.identifier,
      home_country: u.home_country,
      total_points: result.totalPoints,
      countries_visited: visitedCountries.length,
    });
  }

  entries.sort((a, b) => b.total_points - a.total_points);
  entries.forEach((e, i) => { e.rank = i + 1; });

  const top50 = entries.slice(0, 50);
  if (currentUserId) {
    const inTop50 = top50.some((e) => e.user_id === currentUserId);
    if (!inTop50) {
      const userEntry = entries.find((e) => e.user_id === currentUserId);
      if (userEntry) top50.push({ ...userEntry, current_user: true });
    }
  }

  return top50;
}
