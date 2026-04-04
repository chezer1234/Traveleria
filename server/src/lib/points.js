/**
 * Travel Points Calculation Engine — Province-Based Exploration System
 *
 * Tier 1 (top 10 by pop): provinces + optional city bonus for top-15 cities
 * Tier 2 (ranks 11–30):   provinces only
 * Tier 3 (all others):    top-15 cities per country
 * Microstates:            flat points on visit
 *
 * See docs/projects/province-exploration-system.md for full spec.
 */

// ── Country tier classification ──────────────────────────────────────────────

const TIER_1_CODES = new Set([
  'CN', 'IN', 'US', 'ID', 'PK', 'BR', 'NG', 'BD', 'RU', 'MX',
]);

const TIER_2_CODES = new Set([
  'JP', 'ET', 'PH', 'EG', 'VN', 'CD', 'TR', 'IR', 'DE', 'TH',
  'GB', 'FR', 'IT', 'TZ', 'ZA', 'MM', 'KE', 'KR', 'CO', 'ES',
]);

// Flat points for microstates — bypass all exploration formulas
const MICROSTATE_POINTS = {
  VA: 1,  // Vatican City
  MC: 2,  // Monaco
  SM: 2,  // San Marino
  LI: 2,  // Liechtenstein
  AD: 2,  // Andorra
  SG: 3,  // Singapore
};

function getCountryTier(code) {
  if (MICROSTATE_POINTS[code] !== undefined) return 'microstate';
  if (TIER_1_CODES.has(code)) return 1;
  if (TIER_2_CODES.has(code)) return 2;
  return 3;
}

// ── Regional multiplier ──────────────────────────────────────────────────────

const REGION_MULTIPLIERS = {
  'Europe|Europe': 1,
  'Europe|Middle East': 1.5,
  'Europe|Africa': 2.5,
  'Europe|Asia': 2.5,
  'Europe|North America': 3,
  'Europe|South America': 3,
  'Europe|Oceania': 4,

  'Asia|Asia': 1,
  'Asia|Middle East': 1.5,
  'Asia|Europe': 2.5,
  'Asia|Oceania': 2.5,
  'Asia|Africa': 3,
  'Asia|North America': 3,
  'Asia|South America': 4,

  'Middle East|Middle East': 1,
  'Middle East|Europe': 1.5,
  'Middle East|Africa': 1.5,
  'Middle East|Asia': 1.5,
  'Middle East|North America': 3,
  'Middle East|South America': 3.5,
  'Middle East|Oceania': 4,

  'Africa|Africa': 1,
  'Africa|Middle East': 1.5,
  'Africa|Europe': 2.5,
  'Africa|Asia': 3,
  'Africa|South America': 3,
  'Africa|North America': 3,
  'Africa|Oceania': 4,

  'North America|North America': 1,
  'North America|South America': 1.5,
  'North America|Europe': 3,
  'North America|Africa': 3,
  'North America|Middle East': 3,
  'North America|Asia': 3,
  'North America|Oceania': 4,

  'South America|South America': 1,
  'South America|North America': 1.5,
  'South America|Africa': 3,
  'South America|Europe': 3,
  'South America|Middle East': 3.5,
  'South America|Asia': 4,
  'South America|Oceania': 4,

  'Oceania|Oceania': 1,
  'Oceania|Asia': 2.5,
  'Oceania|North America': 3,
  'Oceania|South America': 4,
  'Oceania|Middle East': 4,
  'Oceania|Africa': 4,
  'Oceania|Europe': 4,
};

function getRegionalMultiplier(homeRegion, targetRegion) {
  return REGION_MULTIPLIERS[`${homeRegion}|${targetRegion}`] || 2.5;
}

// ── Base points ──────────────────────────────────────────────────────────────
// base = regional_multiplier × (population / annual_tourists)

function calculateRawBaseline(country, regionalMultiplier) {
  if (country.annual_tourists === 0) return 500;
  return (country.population / country.annual_tourists) * regionalMultiplier;
}

function calculateRegionalAverage(countriesInRegion, regionalMultiplier) {
  const normalBaselines = [];
  for (const c of countriesInRegion) {
    const raw = calculateRawBaseline(c, regionalMultiplier);
    if (raw >= 2 && raw <= 500) {
      normalBaselines.push(raw);
    }
  }
  if (normalBaselines.length === 0) return 25;
  return normalBaselines.reduce((a, b) => a + b, 0) / normalBaselines.length;
}

function applyOutlierCorrection(rawBaseline, regionalAvg, areaKm2) {
  if (rawBaseline >= 2 && rawBaseline <= 500) return rawBaseline;
  const corrected = regionalAvg * Math.log10(areaKm2 / 1000 + 1);
  return Math.max(2, Math.min(500, corrected));
}

function getBaseline(country, homeRegion, allCountries) {
  const regionalMultiplier = getRegionalMultiplier(homeRegion, country.region);
  const rawBaseline = calculateRawBaseline(country, regionalMultiplier);
  const countriesInRegion = allCountries.filter(c => c.region === country.region);
  const regionalAvg = calculateRegionalAverage(countriesInRegion, regionalMultiplier);
  return applyOutlierCorrection(rawBaseline, regionalAvg, country.area_km2);
}

// ── Explorer ceiling ─────────────────────────────────────────────────────────
// explorer_ceiling = base × (area_km2 / regional_value)
//
// regional_value is computed per region from average country population in that
// region, scaled so that Europe anchors at a reasonable baseline. Higher-pop
// regions produce higher regional_value → lower explorer points per km².
// These values will be further calibrated in step 6.

let _regionalValueCache = null;

function computeRegionalValues(allCountries) {
  if (_regionalValueCache) return _regionalValueCache;

  const byRegion = {};
  for (const c of allCountries) {
    if (!byRegion[c.region]) byRegion[c.region] = [];
    byRegion[c.region].push(c);
  }

  // Compute average population per region
  const avgPop = {};
  for (const [region, countries] of Object.entries(byRegion)) {
    const totalPop = countries.reduce((sum, c) => sum + Number(c.population), 0);
    avgPop[region] = totalPop / countries.length;
  }

  // Scale factor: we want Europe's regional_value ≈ 50,000 as an anchor.
  // regional_value = avg_population × SCALE / europe_avg_population × 50000
  const europeAvg = avgPop['Europe'] || 15000000;
  const scaleFactor = 50000 / europeAvg;

  const values = {};
  for (const [region, avg] of Object.entries(avgPop)) {
    values[region] = Math.max(avg * scaleFactor, 10000); // floor at 10,000
  }

  _regionalValueCache = values;
  return values;
}

function getExplorerCeiling(baseline, country, allCountries) {
  const regionalValues = computeRegionalValues(allCountries);
  const rv = regionalValues[country.region] || 50000;
  return baseline * (country.area_km2 / rv);
}

// ── Province points (Tiers 1 & 2) ───────────────────────────────────────────
// Each province: x = (province_pop / national_pop) × explorer_ceiling
// Tier 1 city bonus: visited top-15 cities in a province earn up to 0.4x extra

const TOP_CITIES_PER_COUNTRY = 15;
// const CITY_BONUS_RATIO = 0.4; // Used when city-province mapping is wired in

/**
 * Calculate province-based explorer points.
 * @param {number} explorerCeiling
 * @param {object} country
 * @param {Array} allProvinces - all provinces for this country
 * @param {Array} visitedProvinces - province objects the user has visited
 * @param {Array} allCities - all cities for this country (for Tier 1 city bonus)
 * @param {Array} visitedCities - cities the user has visited in this country
 * @returns {{ explorerPoints: number, explored: number, provinceBreakdown: Array }}
 */
function calculateProvinceExploration(explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities) {
  const tier = getCountryTier(country.code);
  const nationalPop = Number(country.population) || 1;
  const visitedCodes = new Set(visitedProvinces.map(p => p.code));

  // Tier 1 city bonus requires city→province mapping (cities need province_code).
  // That mapping will be wired in a future step. Province base points work now.
  let totalExplorerPoints = 0;
  const provinceBreakdown = [];

  for (const province of allProvinces) {
    const provincePop = Number(province.population) || 0;
    const x = (provincePop / nationalPop) * explorerCeiling;
    const visited = visitedCodes.has(province.code);

    let basePoints = visited ? x : 0;
    let cityBonusPoints = 0;

    // Tier 1 city bonus: when we have city-province mapping, calculate bonus
    // For now, city bonus will be wired in when cities get province_code field

    const total = basePoints + cityBonusPoints;
    totalExplorerPoints += total;

    provinceBreakdown.push({
      code: province.code,
      name: province.name,
      visited,
      maxPoints: round2(x),
      earnedPoints: round2(total),
    });
  }

  const maxPossible = explorerCeiling; // sum of all province x values ≈ ceiling
  const explored = maxPossible > 0 ? Math.min(totalExplorerPoints / maxPossible, 1.0) : 0;

  return {
    explorerPoints: round2(totalExplorerPoints),
    explored: round4(explored),
    provinceBreakdown,
  };
}

// ── Tier 3: city-based exploration ───────────────────────────────────────────
// exploration_ratio = sum(visited_top15_city_pops) / sum(all_top15_city_pops)
// explorer_points = exploration_ratio × explorer_ceiling

function calculateCityExploration(explorerCeiling, _country, allCities, visitedCities) {
  // Rank all cities by population, take top 15
  const sorted = [...allCities].sort((a, b) => Number(b.population) - Number(a.population));
  const top15 = sorted.slice(0, TOP_CITIES_PER_COUNTRY);

  if (top15.length === 0) {
    return { explorerPoints: 0, explored: 0 };
  }

  const top15TotalPop = top15.reduce((sum, c) => sum + Number(c.population), 0);
  const visitedCityIds = new Set(visitedCities.map(c => c.id));

  const visitedTop15Pop = top15
    .filter(c => visitedCityIds.has(c.id))
    .reduce((sum, c) => sum + Number(c.population), 0);

  const explorationRatio = top15TotalPop > 0 ? visitedTop15Pop / top15TotalPop : 0;
  const explorerPoints = explorationRatio * explorerCeiling;

  return {
    explorerPoints: round2(explorerPoints),
    explored: round4(Math.min(explorationRatio, 1.0)),
  };
}

// ── Main scoring function ────────────────────────────────────────────────────

/**
 * Calculate total points for a single country visit.
 *
 * @param {object} country - country row from DB
 * @param {string} homeRegion - user's home region
 * @param {Array} allCountries - all countries (for baseline/regional calculations)
 * @param {object} opts
 * @param {Array} opts.visitedProvinces - provinces the user visited in this country
 * @param {Array} opts.visitedCities - cities the user visited in this country
 * @param {Array} opts.allProvinces - all provinces for this country
 * @param {Array} opts.allCities - all cities for this country
 * @returns {object} points breakdown
 */
function calculateCountryPoints(country, homeRegion, allCountries, opts = {}) {
  const {
    visitedProvinces = [],
    visitedCities = [],
    allProvinces = [],
    allCities = [],
  } = opts;

  const tier = getCountryTier(country.code);

  // Microstates: flat points, no exploration
  if (tier === 'microstate') {
    const flat = MICROSTATE_POINTS[country.code];
    return {
      tier: 'microstate',
      baseline: flat,
      explorerCeiling: 0,
      explorationPoints: 0,
      explored: 0,
      total: flat,
    };
  }

  const baseline = getBaseline(country, homeRegion, allCountries);
  const explorerCeiling = getExplorerCeiling(baseline, country, allCountries);

  let explorationPoints = 0;
  let explored = 0;
  let provinceBreakdown = undefined;

  if (tier === 1 || tier === 2) {
    // Province-based exploration
    const result = calculateProvinceExploration(
      explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities,
    );
    explorationPoints = result.explorerPoints;
    explored = result.explored;
    provinceBreakdown = result.provinceBreakdown;
  } else {
    // Tier 3: city-based exploration
    const result = calculateCityExploration(explorerCeiling, country, allCities, visitedCities);
    explorationPoints = result.explorerPoints;
    explored = result.explored;
  }

  return {
    tier,
    baseline: round2(baseline),
    explorerCeiling: round2(explorerCeiling),
    explorationPoints: round2(explorationPoints),
    explored: round4(explored),
    total: round2(baseline + explorationPoints),
    ...(provinceBreakdown ? { provinceBreakdown } : {}),
  };
}

// ── User total travel points ─────────────────────────────────────────────────

/**
 * Calculate total travel points across all visited countries for a user.
 *
 * @param {string} homeRegion
 * @param {Array} allCountries
 * @param {Array} visitedCountries - array of { country, visitedCities, visitedProvinces, allProvinces, allCities }
 * @returns {{ countries: Array, totalPoints: number }}
 */
function calculateTotalTravelPoints(homeRegion, allCountries, visitedCountries) {
  const countryBreakdown = visitedCountries.map(({ country, visitedCities = [], visitedProvinces = [], allProvinces = [], allCities = [] }) => {
    const pts = calculateCountryPoints(country, homeRegion, allCountries, {
      visitedProvinces,
      visitedCities,
      allProvinces,
      allCities,
    });
    return {
      countryCode: country.code,
      countryName: country.name,
      ...pts,
    };
  });

  const totalPoints = countryBreakdown.reduce((sum, c) => sum + c.total, 0);

  return {
    countries: countryBreakdown,
    totalPoints: round2(totalPoints),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }

/**
 * Reset cached regional values (useful for testing).
 */
function resetCache() { _regionalValueCache = null; }

// ── Legacy compatibility ─────────────────────────────────────────────────────
// getCityPercentage is still used by the countries route for display purposes

function getCityPercentage(cityPopulation, countryPopulation) {
  if (countryPopulation === 0) return 0;
  return cityPopulation / countryPopulation;
}

module.exports = {
  // Tier helpers
  getCountryTier,
  TIER_1_CODES,
  TIER_2_CODES,
  MICROSTATE_POINTS,

  // Core formula
  getRegionalMultiplier,
  calculateRawBaseline,
  calculateRegionalAverage,
  applyOutlierCorrection,
  getBaseline,
  getExplorerCeiling,
  computeRegionalValues,

  // Exploration
  calculateProvinceExploration,
  calculateCityExploration,

  // Main API
  calculateCountryPoints,
  calculateTotalTravelPoints,

  // Utilities
  getCityPercentage,
  resetCache,
  REGION_MULTIPLIERS,
};
