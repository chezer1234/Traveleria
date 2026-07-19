/**
 * Travel Points Calculation Engine — Danger/Explore-Base Redesign
 *
 * Visit base (shown score): distance_multiplier × (tourism_score + danger_score)
 * Explore base (ceiling driver only, never shown): distance_multiplier × (tourism_score + danger_score + size_score)
 * Explorer ceiling: explore_base × log10(area / regional_value + 1)
 * Country total: max(FLOOR, visit_base + exploration_points + city_points + subregion_bonus) — FLOOR applies
 *   to the total, not the visit base, so close/easy countries stay differentiated instead of clustering.
 *
 * Size no longer feeds the visible score — it only feeds the explorer ceiling, since "how much is there
 * to see" is a legitimate reason for size to matter even though "how hard was it to get here" isn't.
 * Danger score comes from a per-country advisory_level (1–4), not crime statistics — see
 * docs/features/points-redesign.md for why crime data breaks on cases like North Korea.
 * Province/experience points are weighted population-INVERSE: less-visited places are worth more,
 * not less. North Korea and Antarctica are explicit overrides, not formula-driven — see the same doc.
 *
 * See docs/points-rebalance-plan.md for the original distance-based rebalance, and
 * docs/features/points-redesign.md for the full spec and worked examples behind this rewrite.
 */

// ── Constants ───────────────────────────────────────────────────────────────

export const TOURISM_WEIGHT = 5.0;
export const TOURISM_CAP = 20.0;
export const SIZE_WEIGHT = 2.0;
export const DANGER_CAP = 6.0;
export const FLOOR = 1.0; // applied to the country TOTAL, not the visit base — see module docstring
export const BASE_CAP = 200.0;
export const FLOOR_POP = 100000; // minimum population used in province/experience weighting, prevents a near-zero-population province from dominating
const EUROPE_ANCHOR = 50000;

// Antarctica: flat override, same for every user regardless of home country.
// No usable population/tourism data exists for it, and almost all Antarctic
// tourism funnels through the same expedition gateways regardless of where
// the traveler started — distance-from-home isn't a meaningful difficulty
// signal here the way it is for every other country. See antarctica.md +
// docs/features/points-redesign.md for the full reasoning.
export const AQ_OVERRIDE_POINTS = 100;

// North Korea: no genuine tourist access to provinces/cities, and no seed
// data to explore even if there were — the explorer ceiling would otherwise
// be unearnable fiction. Visit base (tourism + danger) is still fully
// formula-driven; only exploration is zeroed.
export const NO_EXPLORATION_OVERRIDE = new Set(['KP']);

// ── Country tier classification ─────────────────────────────────────────────

export const TIER_1_CODES = new Set([
  // World top-10 by population
  'CN', 'IN', 'US', 'ID', 'PK', 'BR', 'NG', 'BD', 'RU', 'MX',
  // Oceania
  'NZ', 'AU',
  // North America
  'CA',
  // South America
  'PE',
  // Europe — all countries except microstates (VA, MC, SM, LI, AD)
  'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE',
  'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE',
  'IS', 'IT', 'LT', 'LU', 'LV', 'MD', 'ME', 'MK', 'MT', 'NL',
  'NO', 'PL', 'PT', 'RO', 'RS', 'SE', 'SI', 'SK', 'UA', 'XK',
]);

export const TIER_2_CODES = new Set([
  'JP', 'ET', 'PH', 'EG', 'VN', 'CD', 'TR', 'IR', 'TH',
  'TZ', 'ZA', 'MM', 'KE', 'KR', 'CO',
]);

// Tier 0 (issue #46): US and China get a deeper state/province exploration
// system (experiences, expanded cities, sub-region bonuses). They're also in
// TIER_1_CODES above (true — they're top-10 by population) but getCountryTier
// checks Tier 0 first, so this takes priority.
export const TIER_0_CODES = new Set(['US', 'CN']);

// Tier 0 province value split: visiting a state/province immediately awards
// TIER0_VISIT_RATIO of its base value x; logging all its experiences earns
// the remaining TIER0_EXPERIENCE_RATIO. Cities are a bonus on top of both.
// See docs/features/tier-0-nations.md.
export const TIER0_VISIT_RATIO = 0.9;
export const TIER0_EXPERIENCE_RATIO = 0.5;
export const TIER0_SUBREGION_BONUS_RATIO = 0.5;

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
  if (code === 'AQ') return 'antarctica';
  if (MICROSTATE_POINTS[code] !== undefined) return 'microstate';
  if (TIER_0_CODES.has(code)) return 0;
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

// ── Danger score ─────────────────────────────────────────────────────────────
// From a per-country advisory_level (1 = no restrictions .. 4 = advise against
// all travel) — a blended consensus of government travel-advisory feeds, NOT
// crime statistics. Crime data actively misleads here: authoritarian states
// with total internal control often report near-zero violent crime, which
// would make somewhere like North Korea look safer than reality. Advisory
// levels already fold in political risk, detainment risk, and unrest, which
// is what "danger" needs to mean for this formula.

export function getDangerScore(country) {
  const level = Number(country.advisory_level) || 1;
  return (level - 1) / 3 * DANGER_CAP;
}

// ── Size score ──────────────────────────────────────────────────────────────
// No longer part of the visible visit score — only feeds getExploreBase below.

export function getSizeScore(country) {
  const area = Number(country.area_km2) || 1;
  return Math.log10(area / 1000 + 1) * SIZE_WEIGHT;
}

// ── Base points ─────────────────────────────────────────────────────────────
// Two numbers: getBaseline is the visit base shown to the user (no size).
// getExploreBase is used only to drive the explorer ceiling (includes size).

export function getBaseline(country, homeCountry, _allCountries) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate') return MICROSTATE_POINTS[country.code];
  if (tier === 'antarctica') return AQ_OVERRIDE_POINTS;

  const distMult = getDistanceMultiplier(homeCountry, country);
  const tourism = getTourismScore(country);
  const danger = getDangerScore(country);
  const raw = distMult * (tourism + danger);
  return Math.min(BASE_CAP, round2(raw));
}

export function getExploreBase(country, homeCountry) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate' || tier === 'antarctica') return 0;

  const distMult = getDistanceMultiplier(homeCountry, country);
  const tourism = getTourismScore(country);
  const danger = getDangerScore(country);
  const size = getSizeScore(country);
  const raw = distMult * (tourism + danger + size);
  return Math.min(BASE_CAP, round2(raw));
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
// Log-scaled: explore_base × log10(area / regional_value + 1)
// Driven by explore_base (includes size), not the visible visit base, so a
// dangerous-but-accessible country stays more rewarding to fully explore —
// danger raises both numbers, size only raises this one.

export function getExplorerCeiling(exploreBase, country, allCountries) {
  const tier = getCountryTier(country.code);
  if (tier === 'microstate' || tier === 'antarctica') return 0;
  if (NO_EXPLORATION_OVERRIDE.has(country.code)) return 0;

  const regionalValues = computeRegionalValues(allCountries);
  const rv = regionalValues[country.region] || EUROPE_ANCHOR;
  const area = Number(country.area_km2) || 1;
  return round2(exploreBase * Math.log10(area / rv + 1));
}

// ── Province/experience weighting ───────────────────────────────────────────
// Population-INVERSE: a province fewer people live in is worth more, not
// less — the old model rewarded visiting the capital over anywhere rural,
// which was backwards. Log-dampened (same philosophy as every other log
// scale in this file) so a near-zero-population province doesn't swallow
// the whole ceiling; FLOOR_POP sets the minimum population used in the
// weighting itself. Weights are normalized to sum to 1, so the total
// available across all provinces still equals the full explorer ceiling.

export function getProvinceWeights(allProvinces, nationalPop) {
  const rawWeights = allProvinces.map(p => {
    const pop = Math.max(Number(p.population) || 0, FLOOR_POP);
    return Math.log10(nationalPop / pop + 1);
  });
  const total = rawWeights.reduce((s, w) => s + w, 0) || 1;
  return rawWeights.map(w => w / total);
}

// ── Province points (Tiers 1 & 2) ──────────────────────────────────────────

const TOP_CITIES_PER_COUNTRY = 15;
export const CITY_FLAT_POINTS = 0.5; // major cities, all tiers — historical name, kept for callers
export const CITY_MAJOR_POINTS = CITY_FLAT_POINTS;
export const CITY_ADDITIONAL_POINTS = 0.25; // Tier 0 "additional" cities (issue #46)

export function getCityPointValue(city) {
  return city.city_type === 'additional' ? CITY_ADDITIONAL_POINTS : CITY_MAJOR_POINTS;
}

export function calculateProvinceExploration(explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities) {
  const nationalPop = Number(country.population) || 1;
  const visitedCodes = new Set(visitedProvinces.map(p => p.code));
  const weights = getProvinceWeights(allProvinces, nationalPop);

  let totalExplorerPoints = 0;
  const provinceBreakdown = [];

  allProvinces.forEach((province, i) => {
    const x = weights[i] * explorerCeiling;
    const visited = visitedCodes.has(province.code);
    const total = visited ? x : 0;
    totalExplorerPoints += total;

    provinceBreakdown.push({
      code: province.code,
      name: province.name,
      visited,
      maxPoints: round2(x),
      earnedPoints: round2(total),
    });
  });

  const maxPossible = explorerCeiling;
  const explored = maxPossible > 0 ? Math.min(totalExplorerPoints / maxPossible, 1.0) : 0;

  return {
    explorerPoints: round2(totalExplorerPoints),
    explored: round4(explored),
    provinceBreakdown,
  };
}

// ── Tier 0 province exploration (issue #46) ─────────────────────────────────
// A state/province's base value x is split into a visit baseline (90%,
// awarded the moment it's marked visited) and an experience pool (50%,
// unlocked gradually by logging that state's landmarks). Cities are a bonus
// on top of both. See docs/features/tier-0-nations.md for the full spec.

export function calculateTier0ProvinceExploration(
  explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities, allExperiences, visitedExperienceIds,
) {
  const nationalPop = Number(country.population) || 1;
  const visitedProvinceCodes = new Set(visitedProvinces.map(p => p.code));
  const visitedCityIds = new Set(visitedCities.map(c => c.id));
  const visitedExpIds = new Set(visitedExperienceIds);
  const weights = getProvinceWeights(allProvinces, nationalPop);

  const citiesByProvince = {};
  for (const city of allCities) {
    if (!city.province_code) continue;
    (citiesByProvince[city.province_code] ||= []).push(city);
  }
  const experiencesByProvince = {};
  for (const exp of allExperiences) {
    (experiencesByProvince[exp.province_code] ||= []).push(exp);
  }

  let totalEarned = 0; // visit + experience only — cities are tallied separately, see calculateCityPoints
  let totalCeiling = 0;
  const provinceBreakdown = [];

  allProvinces.forEach((province, i) => {
    const x = weights[i] * explorerCeiling;
    const visited = visitedProvinceCodes.has(province.code);

    const experiences = experiencesByProvince[province.code] || [];
    const experiencePool = TIER0_EXPERIENCE_RATIO * x;
    const experienceValue = experiences.length > 0 ? experiencePool / experiences.length : 0;
    const visitedExpCount = experiences.filter(e => visitedExpIds.has(e.id)).length;
    const experiencePoints = experienceValue * visitedExpCount;

    const cities = citiesByProvince[province.code] || [];
    const cityMax = cities.reduce((s, c) => s + getCityPointValue(c), 0);
    const cityEarned = cities.filter(c => visitedCityIds.has(c.id)).reduce((s, c) => s + getCityPointValue(c), 0);

    const visitBaseline = visited ? TIER0_VISIT_RATIO * x : 0;
    const earned = visitBaseline + experiencePoints; // cities excluded, see note above
    const ceilingForProvince = (TIER0_VISIT_RATIO + TIER0_EXPERIENCE_RATIO) * x;
    const totalAvailable = ceilingForProvince + cityMax;
    const totalEarnedForProvince = visitBaseline + experiencePoints + cityEarned;

    totalEarned += earned;
    totalCeiling += ceilingForProvince;

    provinceBreakdown.push({
      code: province.code,
      name: province.name,
      visited,
      maxPoints: round2(totalAvailable),
      earnedPoints: round2(totalEarnedForProvince),
      experiences: {
        total: experiences.length,
        visited: visitedExpCount,
        pointsEach: round2(experienceValue),
        earned: round2(experiencePoints),
        max: round2(experiencePool),
      },
      cities: { max: round2(cityMax), earned: round2(cityEarned) },
      percentExplored: totalAvailable > 0 ? round4(totalEarnedForProvince / totalAvailable) : 0,
    });
  });

  const explored = totalCeiling > 0 ? Math.min(totalEarned / totalCeiling, 1.0) : 0;

  return {
    explorerPoints: round2(totalEarned),
    explored: round4(explored),
    provinceBreakdown,
  };
}

// Sub-region bonus (issue #46): visiting every state/province in a sub-region
// (Census regions for the US, economic zones for China) earns a bonus equal
// to half the sum of those states' base x values. Visiting, not fully
// exploring, is the trigger.
export function calculateTier0SubregionBonus(explorerCeiling, country, allProvinces, visitedProvinces) {
  const nationalPop = Number(country.population) || 1;
  const visitedCodes = new Set(visitedProvinces.map(p => p.code));
  const weights = getProvinceWeights(allProvinces, nationalPop);
  const weightByCode = {};
  allProvinces.forEach((p, i) => { weightByCode[p.code] = weights[i]; });

  const bySubregion = {};
  for (const p of allProvinces) {
    if (!p.subregion) continue;
    (bySubregion[p.subregion] ||= []).push(p);
  }

  let totalBonus = 0;
  const subregionBreakdown = [];
  for (const [name, provinces] of Object.entries(bySubregion)) {
    const sumX = provinces.reduce((s, p) => s + weightByCode[p.code] * explorerCeiling, 0);
    const bonus = round2(TIER0_SUBREGION_BONUS_RATIO * sumX);
    const visitedCount = provinces.filter(p => visitedCodes.has(p.code)).length;
    const complete = provinces.length > 0 && visitedCount === provinces.length;
    if (complete) totalBonus += bonus;
    subregionBreakdown.push({ name, total: provinces.length, visited: visitedCount, bonus, earned: complete });
  }

  return { totalBonus: round2(totalBonus), subregionBreakdown };
}

// ── City points (all tiers) ─────────────────────────────────────────────────
// 0.5 pts per visited major city, 0.25 for Tier 0 "additional" cities.

export function calculateCityPoints(visitedCities) {
  return round2(visitedCities.reduce((sum, c) => sum + getCityPointValue(c), 0));
}

// Kept for legacy callers / tests — now delegates to flat formula.
export function calculateCityExploration(_explorerCeiling, _country, _allCities, visitedCities) {
  const pts = calculateCityPoints(visitedCities);
  return {
    explorerPoints: pts,
    explored: visitedCities.length > 0 ? 1 : 0,
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

export function getDangerDifficulty(advisoryLevel) {
  if (advisoryLevel >= 4) return 'Advised against all travel';
  if (advisoryLevel === 3) return 'Advised against travel to parts of the country';
  if (advisoryLevel === 2) return 'Some heightened risk';
  return 'No elevated travel risk';
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
  if (tier === 'antarctica') {
    return {
      isMicrostate: false,
      isFlatOverride: true,
      explanation: `Antarctica has no permanent population and no real tourism data to score against, so it gets a flat ${AQ_OVERRIDE_POINTS} points for the achievement of getting there at all — the same for every traveler, regardless of where you live. Almost all Antarctic trips funnel through the same handful of expedition gateways, so distance from home isn't a meaningful difficulty signal here the way it is for every other country.`,
    };
  }

  const distKm = getDistanceKm(homeCountry, country);
  const distMult = getDistanceMultiplier(homeCountry, country);
  const tourismPts = getTourismScore(country);
  const dangerPts = getDangerScore(country);
  const sizePts = getSizeScore(country);
  const pop = Number(country.population);
  const tourists = Number(country.annual_tourists);
  const area = Number(country.area_km2);
  const advisoryLevel = Number(country.advisory_level) || 1;
  const percentile = getDistancePercentile(distKm, homeCountry, allCountries);
  const tourismInfo = getTourismDifficulty(pop, tourists);
  const sizeRef = getSizeComparison(area);
  const isNoExplorationOverride = NO_EXPLORATION_OVERRIDE.has(country.code);

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
    danger: {
      advisoryLevel,
      difficulty: getDangerDifficulty(advisoryLevel),
      points: round2(dangerPts),
      explanation: dangerPts > 0
        ? `${country.name} carries a real travel-advisory risk, which adds ${round2(dangerPts)} points on top of its tourism difficulty.`
        : `${country.name} has no elevated travel-advisory risk right now.`,
    },
    size: {
      areaKm2: area,
      comparison: `about the same size as ${sizeRef}`,
      points: round2(sizePts),
      explanation: `${country.name}'s size doesn't count toward its visit score anymore — but it does widen how many bonus points are available for exploring inside it.`,
    },
    exploration: {
      method: isNoExplorationOverride ? 'unavailable' : tier === 0 ? 'tier0' : (tier === 1 || tier === 2) ? 'provinces' : 'cities',
      ceiling: round2(explorerCeiling),
      earned: round2(explorerEarned || 0),
      ...(explorationDetail || {}),
      explanation: isNoExplorationOverride
        ? `${country.name} has no genuine tourist access to provinces or cities, so there's no exploration bonus available — your score here comes entirely from having visited at all.`
        : tier === 0
          ? `${country.name} is a Tier 0 nation. Visiting a state/province earns ${Math.round(TIER0_VISIT_RATIO * 100)}% of its value immediately; logging all its experiences earns the remaining ${Math.round(TIER0_EXPERIENCE_RATIO * 100)}%. Cities add ${CITY_MAJOR_POINTS} pts (major) or ${CITY_ADDITIONAL_POINTS} pts (additional) on top, and visiting every state in a sub-region earns a bonus.`
          : (tier === 1 || tier === 2)
            ? `Explore provinces within ${country.name} to earn up to ${Math.round(explorerCeiling)} bonus points — less-visited provinces are worth more, not less. Each city you visit adds ${CITY_FLAT_POINTS} pts.`
            : `Each city you visit in ${country.name} adds ${CITY_FLAT_POINTS} pts.`,
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
    allExperiences = [],
    visitedExperienceIds = [],
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

  // Antarctica: flat points, no exploration — see docs/features/points-redesign.md
  if (tier === 'antarctica') {
    const result = {
      tier: 'antarctica',
      baseline: AQ_OVERRIDE_POINTS,
      explorerCeiling: 0,
      explorationPoints: 0,
      explored: 0,
      total: AQ_OVERRIDE_POINTS,
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
  const exploreBase = homeObj
    ? getExploreBase(country, homeObj)
    : getExploreBase(country, homeCountry);
  const explorerCeiling = getExplorerCeiling(exploreBase, country, allCountries);

  let explorationPoints = 0;
  let explored = 0;
  let provinceBreakdown = undefined;
  let subregionBonus = { totalBonus: 0, subregionBreakdown: [] };

  if (tier === 0) {
    const result = calculateTier0ProvinceExploration(
      explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities, allExperiences, visitedExperienceIds,
    );
    explorationPoints = result.explorerPoints;
    explored = result.explored;
    provinceBreakdown = result.provinceBreakdown;
    subregionBonus = calculateTier0SubregionBonus(explorerCeiling, country, allProvinces, visitedProvinces);
  } else if (tier === 1 || tier === 2) {
    const result = calculateProvinceExploration(
      explorerCeiling, country, allProvinces, visitedProvinces, allCities, visitedCities,
    );
    explorationPoints = result.explorerPoints;
    explored = result.explored;
    provinceBreakdown = result.provinceBreakdown;
  }

  // City bonus applies to all tiers: 0.5 pts (major) or 0.25 pts (Tier 0 additional) per visited city
  const cityPoints = calculateCityPoints(visitedCities);

  // FLOOR applies to the country TOTAL, not the visit base — see module docstring
  const total = Math.max(FLOOR, round2(baseline + explorationPoints + cityPoints + subregionBonus.totalBonus));

  const pointsResult = {
    tier,
    baseline: round2(baseline),
    explorerCeiling: round2(explorerCeiling),
    explorationPoints: round2(explorationPoints),
    cityPoints: round2(cityPoints),
    explored: round4(explored),
    total,
    ...(provinceBreakdown ? { provinceBreakdown } : {}),
    ...(tier === 0 ? { subregionBonus: subregionBonus.totalBonus, subregionBreakdown: subregionBonus.subregionBreakdown } : {}),
  };

  if (includeBreakdown && homeObj) {
    const explorationDetail = {};
    if (tier === 0 || tier === 1 || tier === 2) {
      explorationDetail.total = allProvinces.length;
      explorationDetail.visited = visitedProvinces.length;
    }
    if (tier === 0) {
      explorationDetail.subregionBonus = subregionBonus.totalBonus;
      explorationDetail.subregionBreakdown = subregionBonus.subregionBreakdown;
    }
    explorationDetail.citiesVisited = visitedCities.length;
    explorationDetail.cityPoints = cityPoints;
    pointsResult.breakdown = getScoreBreakdown(
      country, homeObj, allCountries, explorerCeiling, explorationPoints, explorationDetail,
    );
  }

  return pointsResult;
}

// ── User total travel points ────────────────────────────────────────────────

export function calculateTotalTravelPoints(homeCountry, allCountries, visitedCountries) {
  const countryBreakdown = visitedCountries.map(({
    country, visitedCities = [], visitedProvinces = [], allProvinces = [], allCities = [],
    allExperiences = [], visitedExperienceIds = [],
  }) => {
    const pts = calculateCountryPoints(country, homeCountry, allCountries, {
      visitedProvinces,
      visitedCities,
      allProvinces,
      allCities,
      allExperiences,
      visitedExperienceIds,
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
// visitedCodes:    Set of alpha-2 country codes the user has visited.
// claimedSubregions: Set of subregion names the user has manually claimed.
//   Pass an empty Set (or omit) to get potential bonuses with earned=0.
// Returns { subregions: [...], totalBonusPoints: number }
export function calculateSubregionBonuses(homeCountry, allCountries, visitedCodes, claimedSubregions = new Set()) {
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
    const isClaimed = claimedSubregions.has(name);
    // Home subregion is never claimed via the normal path (visit bonus = 0)
    const isClaimable = visitedInSR.length > 0 && visitBonus > 0;

    // Bonuses only count when the user has explicitly claimed this subregion.
    // Home subregion completion (flat 5 pts) is auto-awarded without claiming.
    const isHomeSubregion = visitBonus === 0;
    const completionBonusEarned = srCountries.length > 0 && visitedInSR.length === srCountries.length;
    const visitBonusEarned = isClaimed && visitedInSR.length > 0;
    const claimedCompletionBonus = completionBonusEarned && (isClaimed || isHomeSubregion);

    const earned = (visitBonusEarned ? visitBonus : 0) + (claimedCompletionBonus ? completionBonus : 0);
    totalBonusPoints += earned;

    subregions.push({
      name,
      countries: srCountries.map(c => ({ code: c.code, name: c.name, visited: visitedCodes.has(c.code) })),
      visitedCount: visitedInSR.length,
      totalCount: srCountries.length,
      visitBonus,
      completionBonus,
      visitBonusEarned,
      completionBonusEarned: claimedCompletionBonus,
      earned,
      isClaimed,
      isClaimable,
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
