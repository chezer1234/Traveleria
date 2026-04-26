/**
 * Travel Points Calculation Engine — Distance-Based Rebalance
 *
 * Base points:     distance_multiplier × (tourism_score + size_score)
 * Explorer ceiling: baseline × log10(area / regional_value + 1)
 *
 * Distance replaces the old regional multiplier table.
 * Tourism score is log-scaled and capped.
 * Explorer uses inverse-population regional values.
 *
 * See docs/points-rebalance-plan.md for full spec.
 */

// ── Constants ───────────────────────────────────────────────────────────────

export const TOURISM_WEIGHT = 3.0;
export const TOURISM_CAP = 20.0;
export const SIZE_WEIGHT = 2.0;
export const FLOOR = 5.0;
export const BASE_CAP = 200.0;
const EUROPE_ANCHOR = 50000;

// ── Country tier classification ─────────────────────────────────────────────

export const TIER_1_CODES = new Set([
  'CN', 'IN', 'US', 'ID', 'PK', 'BR', 'NG', 'BD', 'RU', 'MX',
]);

export const TIER_2_CODES = new Set([
  'JP', 'ET', 'PH', 'EG', 'VN', 'CD', 'TR', 'IR', 'DE', 'TH',
  'GB', 'FR', 'IT', 'TZ', 'ZA', 'MM', 'KE', 'KR', 'CO', 'ES',
]);

// Flat points for microstates — bypass all exploration formulas
export const MICROSTATE_POINTS = {
  VA: 1,  // Vatican City
  MC: 2,  // Monaco
  SM: 2,  // San Marino
  LI: 2,  // Liechtenstein
  AD: 2,  // Andorra
  SG: 3,  // Singapore
};

export function getCountryTier(code) {
  if (MICROSTATE_POINTS[code] !== undefined) return 'microstate';
  if (TIER_1_CODES.has(code)) return 1;
  if (TIER_2_CODES.has(code)) return 2;
  return 3;
}

// ── Haversine distance ──────────────────────────────────────────────────────

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Distance multiplier ─────────────────────────────────────────────────────
// Continuous multiplier based on great-circle distance from user's home.
// Ranges from 1.0 (distance=0) to ~5.2 (20,000 km).

export function getDistanceMultiplier(homeCountry, targetCountry) {
  if (!homeCountry || !targetCountry) return 3; // fallback
  const homeLat = Number(homeCountry.lat);
  const homeLng = Number(homeCountry.lng);
  const targetLat = Number(targetCountry.lat);
  const targetLng = Number(targetCountry.lng);
  if (isNaN(homeLat) || isNaN(homeLng) || isNaN(targetLat) || isNaN(targetLng)) return 3;
  const distKm = haversine(homeLat, homeLng, targetLat, targetLng);
  return 1 + Math.log2(distKm / 1000 + 1);
}

export function getDistanceKm(homeCountry, targetCountry) {
  if (!homeCountry || !targetCountry) return null;
  const homeLat = Number(homeCountry.lat);
  const homeLng = Number(homeCountry.lng);
  const targetLat = Number(targetCountry.lat);
  const targetLng = Number(targetCountry.lng);
  if (isNaN(homeLat) || isNaN(homeLng) || isNaN(targetLat) || isNaN(targetLng)) return null;
  return Math.round(haversine(homeLat, homeLng, targetLat, targetLng));
}

// ── Tourism score ───────────────────────────────────────────────────────────
// log2(pop/tourists + 1) × weight, capped to prevent single-factor dominance

export function getTourismScore(country) {
  const tourists = Number(country.annual_tourists) || 1;
  const pop = Number(country.population) || 1;
  const raw = Math.log2(pop / tourists + 1) * TOURISM_WEIGHT;
  return Math.min(raw, TOURISM_CAP);
}

// ── Size score ──────────────────────────────────────────────────────────────

export function getSizeScore(country) {
  const area = Number(country.area_km2) || 1;
  return Math.log10(area / 1000 + 1) * SIZE_WEIGHT;
}

// ── Base points ─────────────────────────────────────────────────────────────

export function getBaseline(country, homeCountry, _allCountries) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate') return MICROSTATE_POINTS[country.code];

  const distMult = getDistanceMultiplier(homeCountry, country);
  const tourism = getTourismScore(country);
  const size = getSizeScore(country);
  const raw = distMult * (tourism + size);
  return Math.max(FLOOR, Math.min(BASE_CAP, round2(raw)));
}

// ── Inverse regional values ─────────────────────────────────────────────────
// Inversely proportional to average population per region.
// High-pop regions (Asia) → low value → more explorer per km²
// Low-pop regions (Oceania) → high value → less explorer per km²

let _regionalValueCache = null;

export function computeRegionalValues(allCountries) {
  if (_regionalValueCache) return _regionalValueCache;

  const byRegion = {};
  for (const c of allCountries) {
    if (!byRegion[c.region]) byRegion[c.region] = [];
    byRegion[c.region].push(c);
  }

  const avgPop = {};
  for (const [region, countries] of Object.entries(byRegion)) {
    const totalPop = countries.reduce((sum, c) => sum + Number(c.population), 0);
    avgPop[region] = totalPop / countries.length;
  }

  // Inverse: regional_value = europeAvgPop × ANCHOR / avgPop[region]
  const europeAvg = avgPop['Europe'] || 15000000;
  const anchor = europeAvg * EUROPE_ANCHOR;

  const values = {};
  for (const [region, avg] of Object.entries(avgPop)) {
    values[region] = Math.max(10000, anchor / avg);
  }

  _regionalValueCache = values;
  return values;
}

// ── Explorer ceiling ────────────────────────────────────────────────────────
// Log-scaled: baseline × log10(area / regional_value + 1)
// Prevents massive countries from getting astronomical explorer points.

export function getExplorerCeiling(baseline, country, allCountries) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate') return 0;

  const regionalValues = computeRegionalValues(allCountries);
  const rv = regionalValues[country.region] || EUROPE_ANCHOR;
  const area = Number(country.area_km2) || 1;
  return round2(baseline * Math.log10(area / rv + 1));
}

// ── Province points (Tiers 1 & 2) ──────────────────────────────────────────

const TOP_CITIES_PER_COUNTRY = 15;

export function calculateProvinceExploration(explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities) {
  const nationalPop = Number(country.population) || 1;
  const visitedCodes = new Set(visitedProvinces.map(p => p.code));

  let totalExplorerPoints = 0;
  const provinceBreakdown = [];

  for (const province of allProvinces) {
    const provincePop = Number(province.population) || 0;
    const x = (provincePop / nationalPop) * explorerCeiling;
    const visited = visitedCodes.has(province.code);
    const basePoints = visited ? x : 0;
    const total = basePoints;
    totalExplorerPoints += total;

    provinceBreakdown.push({
      code: province.code,
      name: province.name,
      visited,
      maxPoints: round2(x),
      earnedPoints: round2(total),
    });
  }

  const maxPossible = explorerCeiling;
  const explored = maxPossible > 0 ? Math.min(totalExplorerPoints / maxPossible, 1.0) : 0;

  return {
    explorerPoints: round2(totalExplorerPoints),
    explored: round4(explored),
    provinceBreakdown,
  };
}

// ── Tier 3: city-based exploration ──────────────────────────────────────────

export function calculateCityExploration(explorerCeiling, _country, allCities, visitedCities) {
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

// ── Score breakdown (for transparency UI) ───────────────────────────────────

const SIZE_COMPARISONS = [
  { maxArea: 2000, label: 'London' },
  { maxArea: 5000, label: 'Luxembourg' },
  { maxArea: 15000, label: 'Cyprus' },
  { maxArea: 30000, label: 'Wales' },
  { maxArea: 50000, label: 'Belgium' },
  { maxArea: 90000, label: 'Ireland' },
  { maxArea: 400000, label: 'the UK' },
  { maxArea: 900000, label: 'France' },
  { maxArea: 1500000, label: 'Egypt' },
  { maxArea: 5000000, label: 'India' },
  { maxArea: 12000000, label: 'Australia' },
  { maxArea: Infinity, label: 'Russia' },
];

export function getSizeComparison(areaKm2) {
  for (const entry of SIZE_COMPARISONS) {
    if (areaKm2 <= entry.maxArea) return entry.label;
  }
  return 'Russia';
}

export function getTourismDifficulty(population, annualTourists) {
  if (annualTourists === 0) return { label: 'Extremely hard to visit', ratio: 'Almost no tourists visit' };
  const ratio = population / annualTourists;
  if (ratio < 0.2) return { label: 'Very easy to visit', ratio: `about ${Math.round(annualTourists / population)} tourists for every resident` };
  if (ratio < 1) return { label: 'Easy to visit', ratio: `about ${Math.round(annualTourists / population * 10) / 10} tourists for every resident` };
  if (ratio < 10) return { label: 'Moderate', ratio: `roughly 1 tourist for every ${Math.round(ratio)} people` };
  if (ratio < 100) return { label: 'Hard to visit', ratio: `roughly 1 tourist for every ${Math.round(ratio)} people` };
  if (ratio < 1000) return { label: 'Very hard to visit', ratio: `roughly 1 tourist for every ${Math.round(ratio)} people` };
  return { label: 'Extremely hard to visit', ratio: `roughly 1 tourist for every ${Math.round(ratio).toLocaleString()} people` };
}

function getDistancePercentile(distanceKm, homeCountry, allCountries) {
  if (distanceKm === null) return null;
  const distances = allCountries
    .filter(c => c.code !== (homeCountry && homeCountry.code))
    .map(c => getDistanceKm(homeCountry, c))
    .filter(d => d !== null)
    .sort((a, b) => a - b);
  if (distances.length === 0) return 50;
  const rank = distances.filter(d => d <= distanceKm).length;
  return Math.round((rank / distances.length) * 100);
}

export function getScoreBreakdown(country, homeCountry, allCountries, explorerCeiling, explorerEarned, explorationDetail) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate') {
    return {
      isMicrostate: true,
      explanation: `${country.name} is a microstate and receives a flat ${MICROSTATE_POINTS[country.code]} point${MICROSTATE_POINTS[country.code] !== 1 ? 's' : ''} for visiting.`,
    };
  }

  const distKm = getDistanceKm(homeCountry, country);
  const distMult = getDistanceMultiplier(homeCountry, country);
  const tourismPts = getTourismScore(country);
  const sizePts = getSizeScore(country);
  const pop = Number(country.population);
  const tourists = Number(country.annual_tourists);
  const area = Number(country.area_km2);
  const percentile = getDistancePercentile(distKm, homeCountry, allCountries);
  const tourismInfo = getTourismDifficulty(pop, tourists);
  const sizeRef = getSizeComparison(area);

  return {
    isMicrostate: false,
    distance: {
      km: distKm,
      multiplier: round2(distMult),
      percentile,
      explanation: distKm !== null
        ? `${country.name} is ${distKm.toLocaleString()} km from your home country` +
          (percentile !== null ? ` — in the ${percentile >= 50 ? 'furthest' : 'closest'} ${percentile >= 50 ? 100 - percentile : percentile}% of all countries` : '')
        : 'Distance could not be calculated',
    },
    tourism: {
      population: pop,
      annualTourists: tourists,
      difficulty: tourismInfo.label,
      ratio: tourismInfo.ratio,
      points: round2(tourismPts),
      explanation: `${country.name} gets about ${formatNumber(tourists)} tourists a year for a population of ${formatNumber(pop)} — ${tourismInfo.ratio}`,
    },
    size: {
      areaKm2: area,
      comparison: `about the same size as ${sizeRef}`,
      points: round2(sizePts),
      explanation: `Larger countries have more to see and take more effort to travel across`,
    },
    exploration: {
      method: (tier === 1 || tier === 2) ? 'provinces' : 'cities',
      ceiling: round2(explorerCeiling),
      earned: round2(explorerEarned || 0),
      ...(explorationDetail || {}),
      explanation: explorerCeiling > 0
        ? `Explore ${(tier === 1 || tier === 2) ? 'provinces' : 'major cities'} within ${country.name} to earn up to ${Math.round(explorerCeiling)} bonus points`
        : 'This country has no exploration bonus',
    },
  };
}

export function formatNumber(n) {
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + ' billion';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + ' million';
  if (n >= 1000) return (n / 1000).toFixed(0) + ',000';
  return String(n);
}

// ── Main scoring function ───────────────────────────────────────────────────

export function calculateCountryPoints(country, homeCountry, allCountries, opts = {}) {
  const {
    visitedProvinces = [],
    visitedCities = [],
    allProvinces = [],
    allCities = [],
    includeBreakdown = false,
  } = opts;

  const tier = getCountryTier(country.code);

  // Microstates: flat points, no exploration
  if (tier === 'microstate') {
    const flat = MICROSTATE_POINTS[country.code];
    const result = {
      tier: 'microstate',
      baseline: flat,
      explorerCeiling: 0,
      explorationPoints: 0,
      explored: 0,
      total: flat,
    };
    if (includeBreakdown) {
      result.breakdown = getScoreBreakdown(country, homeCountry, allCountries, 0, 0, null);
    }
    return result;
  }

  // homeCountry can be a country object or a region string (legacy)
  // If it's a string (region), we can't compute distance — use fallback
  const homeObj = typeof homeCountry === 'object' ? homeCountry : null;
  const baseline = homeObj
    ? getBaseline(country, homeObj, allCountries)
    : getBaseline(country, homeCountry, allCountries);
  const explorerCeiling = getExplorerCeiling(baseline, country, allCountries);

  let explorationPoints = 0;
  let explored = 0;
  let provinceBreakdown = undefined;

  if (tier === 1 || tier === 2) {
    const result = calculateProvinceExploration(
      explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities,
    );
    explorationPoints = result.explorerPoints;
    explored = result.explored;
    provinceBreakdown = result.provinceBreakdown;
  } else {
    const result = calculateCityExploration(explorerCeiling, country, allCities, visitedCities);
    explorationPoints = result.explorerPoints;
    explored = result.explored;
  }

  const pointsResult = {
    tier,
    baseline: round2(baseline),
    explorerCeiling: round2(explorerCeiling),
    explorationPoints: round2(explorationPoints),
    explored: round4(explored),
    total: round2(baseline + explorationPoints),
    ...(provinceBreakdown ? { provinceBreakdown } : {}),
  };

  if (includeBreakdown && homeObj) {
    const explorationDetail = {};
    if (tier === 1 || tier === 2) {
      explorationDetail.total = allProvinces.length;
      explorationDetail.visited = visitedProvinces.length;
    } else {
      const sorted = [...allCities].sort((a, b) => Number(b.population) - Number(a.population));
      explorationDetail.total = Math.min(sorted.length, TOP_CITIES_PER_COUNTRY);
      explorationDetail.visited = visitedCities.length;
    }
    pointsResult.breakdown = getScoreBreakdown(
      country, homeObj, allCountries, explorerCeiling, explorationPoints, explorationDetail,
    );
  }

  return pointsResult;
}

// ── User total travel points ────────────────────────────────────────────────

export function calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries) {
  const countryBreakdown = visitedCountries.map(({ country, visitedCities = [], visitedProvinces = [], allProvinces = [], allCities = [] }) => {
    const pts = calculateCountryPoints(country, homeCountry, allCountries, {
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

// ── Subregion bonus points ───────────────────────────────────────────────────
// UN M.49 subregion centroids (anchor lat/lng for distance calculation)

export const SUBREGION_CENTROIDS = {
  'Northern Africa':          { lat:  25.0, lng:  17.0 },
  'Western Africa':           { lat:  12.0, lng:  -2.0 },
  'Middle Africa':            { lat:   4.0, lng:  22.0 },
  'Eastern Africa':           { lat:  -2.0, lng:  36.0 },
  'Southern Africa':          { lat: -29.0, lng:  25.0 },
  'Northern America':         { lat:  48.0, lng: -100.0 },
  'Central America':          { lat:  15.0, lng:  -87.0 },
  'Caribbean':                { lat:  18.0, lng:  -72.0 },
  'South America':            { lat: -14.0, lng:  -55.0 },
  'Western Asia':             { lat:  33.0, lng:   44.0 },
  'Central Asia':             { lat:  43.0, lng:   63.0 },
  'Southern Asia':            { lat:  25.0, lng:   74.0 },
  'South-Eastern Asia':       { lat:  13.0, lng:  106.0 },
  'Eastern Asia':             { lat:  35.0, lng:  115.0 },
  'Northern Europe':          { lat:  60.0, lng:   15.0 },
  'Western Europe':           { lat:  50.0, lng:    8.0 },
  'Southern Europe':          { lat:  42.0, lng:   14.0 },
  'Eastern Europe':           { lat:  52.0, lng:   30.0 },
  'Australia and New Zealand':{ lat: -30.0, lng:  145.0 },
  'Melanesia':                { lat: -10.0, lng:  155.0 },
  'Micronesia':               { lat:   9.0, lng:  160.0 },
  'Polynesia':                { lat: -15.0, lng: -170.0 },
};

// Normalisation constant: log2(20 000 km / 1 000 + 1) ≈ log2(21)
const SUBREGION_DIST_MAX_LOG = Math.log2(21);

// Visit bonus X: 0–60, scaled by distance from home + average tourism difficulty.
// Returns 0 if homeCountry is in the subregion (no bonus for going home).
export function getSubregionVisitBonus(homeCountry, subregionName, subregionCountries) {
  if (!homeCountry) return 30; // fallback when home unknown

  const isHomeSubregion = subregionCountries.some(c => c.code === homeCountry.code);
  if (isHomeSubregion) return 0;

  const centroid = SUBREGION_CENTROIDS[subregionName];
  if (!centroid) return 0;

  const distKm = haversine(
    Number(homeCountry.lat), Number(homeCountry.lng),
    centroid.lat, centroid.lng,
  );
  const distNorm = Math.log2(distKm / 1000 + 1) / SUBREGION_DIST_MAX_LOG;

  const avgTourism = subregionCountries.reduce((s, c) => s + getTourismScore(c), 0)
    / subregionCountries.length;
  const tourismNorm = avgTourism / TOURISM_CAP;

  return Math.round(60 * (0.5 * distNorm + 0.5 * tourismNorm));
}

// Full subregion bonus calculation for a user.
// visitedCodes: Set of alpha-2 country codes the user has visited.
// Returns { subregions: [...], totalBonusPoints: number }
export function calculateSubregionBonuses(homeCountry, allCountries, visitedCodes) {
  const bySubregion = {};
  for (const c of allCountries) {
    if (!c.subregion) continue;
    (bySubregion[c.subregion] ||= []).push(c);
  }

  let totalBonusPoints = 0;
  const subregions = [];

  for (const [name, srCountries] of Object.entries(bySubregion)) {
    const visitBonus = getSubregionVisitBonus(homeCountry, name, srCountries);
    // Home subregion: visit bonus is 0, completion always gives 5
    const completionBonus = visitBonus === 0 ? 5 : visitBonus;

    const visitedInSR = srCountries.filter(c => visitedCodes.has(c.code));
    const visitBonusEarned = visitedInSR.length > 0;
    const completionBonusEarned = srCountries.length > 0 && visitedInSR.length === srCountries.length;

    const earned = (visitBonusEarned ? visitBonus : 0) + (completionBonusEarned ? completionBonus : 0);
    totalBonusPoints += earned;

    subregions.push({
      name,
      countries: srCountries.map(c => ({ code: c.code, name: c.name, visited: visitedCodes.has(c.code) })),
      visitedCount: visitedInSR.length,
      totalCount: srCountries.length,
      visitBonus,
      completionBonus,
      visitBonusEarned,
      completionBonusEarned,
      earned,
    });
  }

  return { subregions, totalBonusPoints };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round2(n) { return Math.round(n * 100) / 100; }
function round4(n) { return Math.round(n * 10000) / 10000; }
export function resetCache() { _regionalValueCache = null; }

// Legacy compatibility
export function getCityPercentage(cityPopulation, countryPopulation) {
  if (countryPopulation === 0) return 0;
  return cityPopulation / countryPopulation;
}
