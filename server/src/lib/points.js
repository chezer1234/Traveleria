/**
 * Travel Points Calculation Engine
 * Implements Spec Section 9: Option E Hybrid with outlier correction.
 */

// --- 9.2 Regional Multiplier ---

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

/**
 * Get the regional multiplier for a home→target region pair.
 * @param {string} homeRegion
 * @param {string} targetRegion
 * @returns {number}
 */
function getRegionalMultiplier(homeRegion, targetRegion) {
  const key = `${homeRegion}|${targetRegion}`;
  return REGION_MULTIPLIERS[key] || 2.5; // default moderate if unknown pair
}

// --- 9.2 Baseline ---

/**
 * Calculate the raw baseline for a country.
 * baseline = (population / annual_tourists) * regional_multiplier
 */
function calculateRawBaseline(country, regionalMultiplier) {
  if (country.annual_tourists === 0) return 500;
  return (country.population / country.annual_tourists) * regionalMultiplier;
}

// --- 9.3 Outlier Correction ---

/**
 * Calculate the regional average baseline for countries in normal range (2–500).
 * @param {Array} countriesInRegion - array of country objects in the same region
 * @param {number} regionalMultiplier - multiplier for the user's home→this region
 * @returns {number}
 */
function calculateRegionalAverage(countriesInRegion, regionalMultiplier) {
  const normalBaselines = [];
  for (const c of countriesInRegion) {
    const raw = calculateRawBaseline(c, regionalMultiplier);
    if (raw >= 2 && raw <= 500) {
      normalBaselines.push(raw);
    }
  }
  if (normalBaselines.length === 0) return 25; // fallback
  return normalBaselines.reduce((a, b) => a + b, 0) / normalBaselines.length;
}

/**
 * Apply outlier correction if raw baseline is outside 2–500 range.
 * corrected = regionalAvg * log10(area_km2 / 1000 + 1), clamped to [2, 500]
 */
function applyOutlierCorrection(rawBaseline, regionalAvg, areaKm2) {
  if (rawBaseline >= 2 && rawBaseline <= 500) {
    return rawBaseline;
  }
  const corrected = regionalAvg * Math.log10(areaKm2 / 1000 + 1);
  return Math.max(2, Math.min(500, corrected));
}

/**
 * Get the final baseline for a country given user's home country and all countries data.
 * @param {object} country - the target country
 * @param {string} homeRegion - the user's home region
 * @param {Array} allCountries - all countries (for regional average calculation)
 * @returns {number}
 */
function getBaseline(country, homeRegion, allCountries) {
  const regionalMultiplier = getRegionalMultiplier(homeRegion, country.region);
  const rawBaseline = calculateRawBaseline(country, regionalMultiplier);

  const countriesInRegion = allCountries.filter(c => c.region === country.region);
  const regionalAvg = calculateRegionalAverage(countriesInRegion, regionalMultiplier);

  return applyOutlierCorrection(rawBaseline, regionalAvg, country.area_km2);
}

// --- 9.4 Total Country Points (Exploration Ceiling) ---

/**
 * area_multiplier = max(area_km2 / 50000, 2)
 */
function getAreaMultiplier(areaKm2) {
  return Math.max(areaKm2 / 50000, 2);
}

/**
 * total_country_points = baseline * area_multiplier
 */
function getTotalCountryPoints(baseline, areaKm2) {
  return baseline * getAreaMultiplier(areaKm2);
}

// --- 9.5 City Visits & Exploration Percentage ---

/**
 * city_percentage = city.population / country.population
 */
function getCityPercentage(cityPopulation, countryPopulation) {
  if (countryPopulation === 0) return 0;
  return cityPopulation / countryPopulation;
}

/**
 * Sum of city percentages, capped at 1.0
 */
function getCountryExplored(visitedCities, countryPopulation) {
  const total = visitedCities.reduce(
    (sum, city) => sum + getCityPercentage(city.population, countryPopulation),
    0
  );
  return Math.min(total, 1.0);
}

// --- 9.6 Final Points Per Country ---

/**
 * final = baseline + (totalCountryPoints * countryExplored)
 */
function calculateCountryPoints(country, homeRegion, allCountries, visitedCities) {
  const baseline = getBaseline(country, homeRegion, allCountries);
  const totalCountryPts = getTotalCountryPoints(baseline, country.area_km2);
  const explored = getCountryExplored(visitedCities, country.population);

  return {
    baseline: Math.round(baseline * 100) / 100,
    explorationPoints: Math.round(totalCountryPts * explored * 100) / 100,
    explored: Math.round(explored * 10000) / 10000,
    total: Math.round((baseline + totalCountryPts * explored) * 100) / 100,
  };
}

// --- 9.7 User's Total Travel Points ---

/**
 * Calculate total travel points across all visited countries for a user.
 * @param {string} homeRegion
 * @param {Array} allCountries
 * @param {Array} visitedCountries - array of { country, visitedCities }
 * @returns {{ countries: Array, totalPoints: number }}
 */
function calculateTotalTravelPoints(homeRegion, allCountries, visitedCountries) {
  const countryBreakdown = visitedCountries.map(({ country, visitedCities }) => {
    const pts = calculateCountryPoints(country, homeRegion, allCountries, visitedCities);
    return {
      countryCode: country.code,
      countryName: country.name,
      ...pts,
    };
  });

  const totalPoints = countryBreakdown.reduce((sum, c) => sum + c.total, 0);

  return {
    countries: countryBreakdown,
    totalPoints: Math.round(totalPoints * 100) / 100,
  };
}

module.exports = {
  getRegionalMultiplier,
  calculateRawBaseline,
  calculateRegionalAverage,
  applyOutlierCorrection,
  getBaseline,
  getAreaMultiplier,
  getTotalCountryPoints,
  getCityPercentage,
  getCountryExplored,
  calculateCountryPoints,
  calculateTotalTravelPoints,
  REGION_MULTIPLIERS,
};
