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
  calculateSubregionBonuses,
  getDistanceKm,
} from './points.js';
import { getContinent } from './continents.js';

// Country columns we always want when we pass a row into points.js. Kept in
// one place so a schema addition only requires one touch.
const COUNTRY_COLS = 'code, name, region, subregion, population, annual_tourists, area_km2, lat, lng';

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
    `SELECT id, name, population, province_code, city_type FROM cities WHERE country_code = ? ORDER BY population DESC`,
    [code],
  );
}

// Tier 0 (issue #46): experiences for every province in a country.
async function loadExperiencesForCountry(db, provinceCodes) {
  if (!provinceCodes.length) return [];
  const placeholders = provinceCodes.map(() => '?').join(',');
  return db.all(
    `SELECT id, province_code, name, description FROM province_experiences WHERE province_code IN (${placeholders})`,
    provinceCodes,
  );
}

// Experience ids this user has logged, scoped to one country's provinces.
async function loadVisitedExperienceIds(db, userId, provinceCodes) {
  if (!provinceCodes.length) return [];
  const placeholders = provinceCodes.map(() => '?').join(',');
  const rows = await db.all(
    `SELECT province_experiences.id AS id
       FROM user_province_experiences
       JOIN province_experiences ON user_province_experiences.experience_id = province_experiences.id
       WHERE user_province_experiences.user_id = ? AND province_experiences.province_code IN (${placeholders})`,
    [userId, ...provinceCodes],
  );
  return rows.map((r) => r.id);
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
      `SELECT cities.id, cities.name, cities.population, cities.province_code, cities.city_type
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
    const allCities = tier !== 'microstate' ? await loadCitiesForCountry(db, country.code) : [];

    let allExperiences = [];
    let visitedExperienceIds = [];
    if (tier === 0) {
      const provinceCodes = allProvinces.map((p) => p.code);
      allExperiences = await loadExperiencesForCountry(db, provinceCodes);
      visitedExperienceIds = await loadVisitedExperienceIds(db, userId, provinceCodes);
    }

    visitedCountries.push({
      country,
      visitedCities,
      visitedProvinces,
      allProvinces,
      allCities,
      allExperiences,
      visitedExperienceIds,
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

  return visitedCountries.map(({ country, visitedCities, visitedProvinces, allProvinces, allCities, allExperiences, visitedExperienceIds, visited_at }) => {
    const pts = calculateCountryPoints(country, homeCountry, allCountries, {
      visitedProvinces,
      visitedCities,
      allProvinces,
      allCities,
      allExperiences,
      visitedExperienceIds,
    });
    return {
      country_code: country.code,
      country_name: country.name,
      region: country.region,
      subregion: country.subregion,
      population: country.population,
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

  const visitedCodes = new Set(visitedCountries.map(({ country }) => country.code));
  const claimedRows = await db.all(
    `SELECT subregion FROM user_subregions WHERE user_id = ?`, [userId],
  );
  const claimedSubregions = new Set(claimedRows.map(r => r.subregion));
  const { totalBonusPoints } = calculateSubregionBonuses(
    homeCountry, allCountries, visitedCodes, claimedSubregions,
  );

  return {
    user_id: userId,
    ...result,
    totalPoints: Math.round((result.totalPoints + totalBonusPoints) * 100) / 100,
    subregionBonusPoints: totalBonusPoints,
  };
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
    province_code: city.province_code,
    city_type: city.city_type,
    percentage: Math.round(getCityPercentage(city.population, country.population) * 10000) / 100,
  }));

  let provinces = [];
  let experiences = [];
  if (tier === 0 || tier === 1 || tier === 2) {
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
      subregion: p.subregion,
      maxPoints: Math.round(((Number(p.population) / nationalPop) * explorerCeiling) * 100) / 100,
    }));

    if (tier === 0) {
      experiences = await loadExperiencesForCountry(db, rawProvinces.map((p) => p.code));
    }
  }

  const explorationDetail = {};
  if (tier === 0 || tier === 1 || tier === 2) {
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
    isTier0: tier === 0,
    baseline_points: Math.round(baseline * 100) / 100,
    explorer_ceiling: Math.round(explorerCeiling * 100) / 100,
    cities: citiesWithPercentage,
    provinces,
    ...(tier === 0 ? { experiences } : {}),
    breakdown,
  };
}

// Tier 0 (issue #46): real per-province breakdown (earnedPoints, maxPoints,
// percentExplored, experiences/cities sub-totals) for one country + user.
// Used by CountryDetail for the hover map + hover % — the simple "visited ?
// full maxPoints : 0" approximation used elsewhere doesn't hold for Tier 0,
// where a visited province can be anywhere from 90% to >140% earned.
export async function getUserCountryScoreLocal(db, userId, code, homeCountryCode) {
  const upperCode = code.toUpperCase();
  const country = await db.get(`SELECT * FROM countries WHERE code = ?`, [upperCode]);
  if (!country) return null;

  const allCountries = await loadAllCountries(db);
  const home = allCountries.find((c) => c.code === (homeCountryCode || '').toUpperCase()) || null;

  const allProvinces = await db.all(
    `SELECT * FROM provinces WHERE country_code = ? ORDER BY population DESC`,
    [upperCode],
  );
  const allCities = await loadCitiesForCountry(db, upperCode);
  const provinceCodes = allProvinces.map((p) => p.code);
  const allExperiences = await loadExperiencesForCountry(db, provinceCodes);

  const visitedProvinces = await db.all(
    `SELECT provinces.* FROM user_provinces
       JOIN provinces ON user_provinces.province_code = provinces.code
       WHERE user_provinces.user_id = ? AND provinces.country_code = ?`,
    [userId, upperCode],
  );
  const visitedCities = await db.all(
    `SELECT cities.id, cities.name, cities.population, cities.province_code, cities.city_type
       FROM user_cities JOIN cities ON user_cities.city_id = cities.id
       WHERE user_cities.user_id = ? AND cities.country_code = ?`,
    [userId, upperCode],
  );
  const visitedExperienceIds = await loadVisitedExperienceIds(db, userId, provinceCodes);

  return calculateCountryPoints(country, home, allCountries, {
    allProvinces,
    visitedProvinces,
    allCities,
    visitedCities,
    allExperiences,
    visitedExperienceIds,
    includeBreakdown: true,
  });
}

// Country-detail helpers: whether the signed-in user has visited this country
// and which cities/provinces inside it they've logged. Folded into one call to
// avoid three sequential awaits.
export async function getUserStatusForCountry(db, userId, code) {
  const upperCode = code.toUpperCase();
  const [uc, cityIds, provinceCodes, experienceIds] = await Promise.all([
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
    // Tier 0 (issue #46): experiences the user has logged within this country.
    db.all(
      `SELECT upe.experience_id AS experience_id FROM user_province_experiences upe
         JOIN province_experiences pe ON pe.id = upe.experience_id
         JOIN provinces p ON p.code = pe.province_code
         WHERE upe.user_id = ? AND p.country_code = ?`,
      [userId, upperCode],
    ),
  ]);
  return {
    isVisited: !!uc,
    visitedCityIds: new Set((cityIds || []).map((r) => r.city_id)),
    visitedProvinceCodes: new Set((provinceCodes || []).map((r) => r.province_code)),
    visitedExperienceIds: new Set((experienceIds || []).map((r) => r.experience_id)),
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

  const allSubregionClaims = await db.all(`SELECT user_id, subregion FROM user_subregions`);
  const claimedByUser = {};
  for (const r of allSubregionClaims) {
    (claimedByUser[r.user_id] ||= new Set()).add(r.subregion);
  }

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
        `SELECT c.id, c.name, c.population, c.province_code, c.city_type FROM user_cities uc
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
      const allCities = tier !== 'microstate' ? await loadCitiesForCountry(db, country.code) : [];
      let allExperiences = [];
      let visitedExperienceIds = [];
      if (tier === 0) {
        const provinceCodes = allProvinces.map((p) => p.code);
        allExperiences = await loadExperiencesForCountry(db, provinceCodes);
        visitedExperienceIds = await loadVisitedExperienceIds(db, u.id, provinceCodes);
      }
      visitedCountries.push({ country, visitedCities, visitedProvinces, allProvinces, allCities, allExperiences, visitedExperienceIds });
    }

    const result = calculateTotalTravelPoints(home, allCountries, visitedCountries);
    const visitedCodes = new Set(visits.map(v => v.country_code));
    const claimedSubregions = claimedByUser[u.id] || new Set();
    const { totalBonusPoints } = calculateSubregionBonuses(home, allCountries, visitedCodes, claimedSubregions);
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
  if (currentUserId) {
    const inTop50 = top50.some((e) => e.user_id === currentUserId);
    if (!inTop50) {
      const userEntry = entries.find((e) => e.user_id === currentUserId);
      if (userEntry) top50.push({ ...userEntry, current_user: true });
    }
  }

  return top50;
}

// ---------- Country time-log visits (territory score, issue #29) ----------

// A user's logged stays in one country, newest-dated first (undated last), plus
// the summed total days. Drives the "Time spent here" card on CountryDetail.
export async function getCountryVisitsLocal(db, userId, code) {
  const upperCode = code.toUpperCase();
  const visits = await db.all(
    `SELECT id, days, visited_at FROM user_country_visits
       WHERE user_id = ? AND country_code = ?
       ORDER BY (visited_at IS NULL), visited_at DESC`,
    [userId, upperCode],
  );
  const totalDays = visits.reduce((sum, v) => sum + (Number(v.days) || 0), 0);
  return { visits, totalDays };
}

// Map of country_code → total logged days for a user. Used by the territory
// comparison to decide who's spent longer in each country.
export async function getUserDaysByCountry(db, userId) {
  const rows = await db.all(
    `SELECT country_code, SUM(days) AS days FROM user_country_visits
       WHERE user_id = ? GROUP BY country_code`,
    [userId],
  );
  const byCode = {};
  for (const r of rows) byCode[r.country_code] = Number(r.days) || 0;
  return byCode;
}

// ---------- Province time-log visits (Tier 0, issue #46 Phase 2) ----------
// Mirrors the country time-log queries above exactly, scoped to a province.

export async function getProvinceVisitsLocal(db, userId, provinceCode) {
  const visits = await db.all(
    `SELECT id, days, visited_at FROM user_province_visits
       WHERE user_id = ? AND province_code = ?
       ORDER BY (visited_at IS NULL), visited_at DESC`,
    [userId, provinceCode],
  );
  const totalDays = visits.reduce((sum, v) => sum + (Number(v.days) || 0), 0);
  return { visits, totalDays };
}

// Map of province_code → total logged days for a user, scoped to one country's
// provinces. Used by the state-level territory comparison.
export async function getUserDaysByProvince(db, userId, provinceCodes) {
  if (!provinceCodes.length) return {};
  const placeholders = provinceCodes.map(() => '?').join(',');
  const rows = await db.all(
    `SELECT province_code, SUM(days) AS days FROM user_province_visits
       WHERE user_id = ? AND province_code IN (${placeholders}) GROUP BY province_code`,
    [userId, ...provinceCodes],
  );
  const byCode = {};
  for (const r of rows) byCode[r.province_code] = Number(r.days) || 0;
  return byCode;
}

// Other users who've also visited a country — the opponent pool for a state
// battle (issue #46 Phase 2: battles are only offered between two people who
// have both been to the country).
export async function getUsersWhoVisitedCountryLocal(db, countryCode, excludeUserId) {
  const rows = await db.all(
    `SELECT u.id, u.identifier, u.home_country
       FROM user_countries uc
       JOIN users_public u ON u.id = uc.user_id
       WHERE uc.country_code = ? AND uc.user_id != ?`,
    [countryCode, excludeUserId],
  );
  return rows;
}

// A public user record from the locally-synced users_public table (no network).
export async function getUserPublicLocal(db, userId) {
  return db.get(
    `SELECT id, identifier, home_country FROM users_public WHERE id = ?`,
    [userId],
  );
}

// ── Groups (issue #37) ───────────────────────────────────────────────────────

// All groups the given user belongs to, with their members.
export async function getUserGroupsLocal(db, userId) {
  const memberRows = await db.all(
    `SELECT gm.group_id FROM group_members gm WHERE gm.user_id = ?`,
    [userId],
  );
  if (!memberRows.length) return [];

  const groupIds = memberRows.map((r) => r.group_id);
  const placeholders = groupIds.map(() => '?').join(',');

  const [groupRows, allMembers] = await Promise.all([
    db.all(`SELECT * FROM groups WHERE id IN (${placeholders})`, groupIds),
    db.all(`SELECT * FROM group_members WHERE group_id IN (${placeholders})`, groupIds),
  ]);

  const userIds = [...new Set(allMembers.map((m) => m.user_id))];
  const userPlaceholders = userIds.map(() => '?').join(',');
  const users = userIds.length
    ? await db.all(`SELECT id, identifier, home_country FROM users_public WHERE id IN (${userPlaceholders})`, userIds)
    : [];
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  const membersByGroup = {};
  for (const m of allMembers) {
    (membersByGroup[m.group_id] ||= []).push({ ...m, user: userById[m.user_id] || null });
  }

  return groupRows.map((g) => ({
    ...g,
    members: (membersByGroup[g.id] || []).sort((a, b) => a.joined_at.localeCompare(b.joined_at)),
  }));
}

// ── Province + city visit helpers ───────────────────────────────────────────

// All province codes this user has visited (any country).
export async function getUserVisitedProvinceCodesLocal(db, userId) {
  const rows = await db.all(
    `SELECT province_code FROM user_provinces WHERE user_id = ?`,
    [userId],
  );
  return new Set(rows.map(r => r.province_code));
}

// All cities the user has visited, as {name, country_code} pairs.
export async function getUserVisitedCityNamesLocal(db, userId) {
  const rows = await db.all(
    `SELECT c.name, c.country_code
       FROM user_cities uc
       JOIN cities c ON c.id = uc.city_id
       WHERE uc.user_id = ?`,
    [userId],
  );
  return rows;
}

// ── Checklist progress (issue #44) ──────────────────────────────────────────

export async function getChecklistStatusLocal(db, userId) {
  const [countryCount, provinceCount, cityCount, subregionCount] = await Promise.all([
    db.value(`SELECT COUNT(*) FROM user_countries WHERE user_id = ?`, [userId]),
    db.value(`SELECT COUNT(*) FROM user_provinces WHERE user_id = ?`, [userId]),
    db.value(`SELECT COUNT(*) FROM user_cities WHERE user_id = ?`, [userId]),
    db.value(`SELECT COUNT(*) FROM user_subregions WHERE user_id = ?`, [userId]),
  ]);
  return {
    hasCountry: (Number(countryCount) || 0) > 0,
    hasProvince: (Number(provinceCount) || 0) > 0,
    hasCity: (Number(cityCount) || 0) > 0,
    hasSubregion: (Number(subregionCount) || 0) > 0,
  };
}

// ── Subregion bonus data ─────────────────────────────────────────────────────

export async function getSubregionsLocal(db, userId, homeCountryCode) {
  const allCountries = await db.all(
    `SELECT code, name, region, subregion, population, annual_tourists, area_km2, lat, lng
     FROM countries ORDER BY name`,
  );
  const homeCountry = allCountries.find(c => c.code === homeCountryCode) || null;

  const [visitedRows, claimedRows] = await Promise.all([
    db.all(`SELECT country_code FROM user_countries WHERE user_id = ?`, [userId]),
    db.all(`SELECT subregion FROM user_subregions WHERE user_id = ?`, [userId]),
  ]);
  const visitedCodes = new Set(visitedRows.map(r => r.country_code));
  const claimedSubregions = new Set(claimedRows.map(r => r.subregion));

  return calculateSubregionBonuses(homeCountry, allCountries, visitedCodes, claimedSubregions);
}

// ── Trophy Cabinet (visual-refresh-atlas) ────────────────────────────────────

// Everything the trophy evaluator (lib/trophies.js evaluateTrophies) needs, in
// one gather. Sub-regions use the same definition as the Map page stat:
// distinct non-null countries.subregion values among visited countries.
// Distances come from the same haversine the scoring engine uses
// (points.js getDistanceKm) — null when there's no home country to measure from.
export async function getTrophyStatusLocal(db, userId, homeCountryCode) {
  const [allCountries, visitedRows, experienceCount, score] = await Promise.all([
    loadAllCountries(db),
    db.all(
      `SELECT c.code, c.name, c.region, c.subregion, c.population,
              c.annual_tourists, c.area_km2, c.lat, c.lng, uc.visited_at
         FROM user_countries uc
         JOIN countries c ON c.code = uc.country_code
         WHERE uc.user_id = ?
         ORDER BY (uc.visited_at IS NULL), uc.visited_at ASC`,
      [userId],
    ),
    db.value(`SELECT COUNT(*) FROM user_province_experiences WHERE user_id = ?`, [userId]),
    getUserScoreLocal(db, userId, homeCountryCode),
  ]);

  const home = allCountries.find((c) => c.code === (homeCountryCode || '').toUpperCase()) || null;
  const withDistance = (c) => ({ ...c, distanceKm: getDistanceKm(home, c) });
  const visited = visitedRows.map(withDistance);

  return {
    home,
    allCountries: allCountries.map(withDistance),
    visited,
    subregions: [...new Set(visited.filter((c) => c.subregion).map((c) => c.subregion))],
    continents: [...new Set(visited.map((c) => getContinent(c.subregion)).filter(Boolean))],
    experiencesCompleted: Number(experienceCount) || 0,
    totalPoints: score.totalPoints,
  };
}
