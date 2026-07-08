/**
 * Unit tests for the Travel Points calculation engine.
 * Tests: tiers, distance multiplier, baseline, explorer ceiling,
 *        province exploration, city exploration, final score, breakdown.
 */
import {
  getCountryTier,
  haversine,
  getDistanceMultiplier,
  getDistanceKm,
  getTourismScore,
  getSizeScore,
  getBaseline,
  getExplorerCeiling,
  getCityPercentage,
  calculateProvinceExploration,
  calculateCityExploration,
  calculateCityPoints,
  calculateTier0ProvinceExploration,
  calculateTier0SubregionBonus,
  calculateCountryPoints,
  calculateTotalTravelPoints,
  computeRegionalValues,
  resetCache,
  getTourismDifficulty,
  getSizeComparison,
  formatNumber,
  TOURISM_CAP,
  FLOOR,
  BASE_CAP,
  TIER0_VISIT_RATIO,
  TIER0_EXPERIENCE_RATIO,
  CITY_MAJOR_POINTS,
  CITY_ADDITIONAL_POINTS,
} from '../points.js';

// Sample countries for testing (with lat/lng)
const sampleCountries = [
  { code: 'FR', name: 'France', region: 'Europe', population: 67390000, annual_tourists: 90000000, area_km2: 640679, lat: 48.86, lng: 2.35 },
  { code: 'DE', name: 'Germany', region: 'Europe', population: 83783942, annual_tourists: 39563000, area_km2: 357022, lat: 52.52, lng: 13.41 },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', population: 67886011, annual_tourists: 39418000, area_km2: 242495, lat: 51.51, lng: -0.13 },
  { code: 'IS', name: 'Iceland', region: 'Europe', population: 341243, annual_tourists: 2343000, area_km2: 103000, lat: 64.15, lng: -21.94 },
  { code: 'KP', name: 'North Korea', region: 'Asia', population: 25778816, annual_tourists: 5000, area_km2: 120538, lat: 39.02, lng: 125.75 },
  { code: 'JP', name: 'Japan', region: 'Asia', population: 126476461, annual_tourists: 31882000, area_km2: 377975, lat: 35.68, lng: 139.69 },
  { code: 'AU', name: 'Australia', region: 'Oceania', population: 25499884, annual_tourists: 9466000, area_km2: 7741220, lat: -35.28, lng: 149.13 },
  { code: 'VA', name: 'Vatican City', region: 'Europe', population: 825, annual_tourists: 5000000, area_km2: 1, lat: 41.90, lng: 12.45 },
  { code: 'US', name: 'United States', region: 'North America', population: 331002651, annual_tourists: 79256000, area_km2: 9833517, lat: 38.91, lng: -77.04 },
  { code: 'BR', name: 'Brazil', region: 'South America', population: 212559417, annual_tourists: 6621000, area_km2: 8515767, lat: -15.79, lng: -47.88 },
  { code: 'PT', name: 'Portugal', region: 'Europe', population: 10196709, annual_tourists: 16000000, area_km2: 92090, lat: 38.72, lng: -9.14 },
  { code: 'LA', name: 'Laos', region: 'Asia', population: 7275560, annual_tourists: 4791000, area_km2: 236800, lat: 17.97, lng: 102.63 },
];

const homeGB = sampleCountries.find(c => c.code === 'GB');

beforeEach(() => {
  resetCache();
});

// ── Tier classification ─────────────────────────────────────────────────────

describe('Country Tiers', () => {
  test('Tier 0: US and China (issue #46)', () => {
    expect(getCountryTier('US')).toBe(0);
    expect(getCountryTier('CN')).toBe(0);
  });

  test('Tier 1: top 10 by population (excluding Tier 0)', () => {
    expect(getCountryTier('BR')).toBe(1);
    expect(getCountryTier('MX')).toBe(1);
  });

  test('Tier 2: ranks 11-30', () => {
    expect(getCountryTier('JP')).toBe(2);
    expect(getCountryTier('ET')).toBe(2);
    expect(getCountryTier('KR')).toBe(2);
    expect(getCountryTier('ZA')).toBe(2);
  });

  test('Tier 3: all others', () => {
    expect(getCountryTier('LA')).toBe(3);
    expect(getCountryTier('BO')).toBe(3);
    expect(getCountryTier('GH')).toBe(3);
  });

  test('Microstates', () => {
    expect(getCountryTier('VA')).toBe('microstate');
    expect(getCountryTier('MC')).toBe('microstate');
    expect(getCountryTier('SG')).toBe('microstate');
  });
});

// ── Distance calculation ────────────────────────────────────────────────────

describe('Distance', () => {
  test('haversine returns ~0 for same point', () => {
    const d = haversine(51.51, -0.13, 51.51, -0.13);
    expect(d).toBeCloseTo(0, 0);
  });

  test('London to Paris is ~340 km', () => {
    const d = haversine(51.51, -0.13, 48.86, 2.35);
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });

  test('London to Tokyo is ~9500 km', () => {
    const d = haversine(51.51, -0.13, 35.68, 139.69);
    expect(d).toBeGreaterThan(9000);
    expect(d).toBeLessThan(10000);
  });

  test('distance multiplier is 1.0 for distance=0', () => {
    const mult = getDistanceMultiplier(homeGB, homeGB);
    expect(mult).toBeCloseTo(1.0, 1);
  });

  test('distance multiplier increases with distance', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const japan = sampleCountries.find(c => c.code === 'JP');
    const aus = sampleCountries.find(c => c.code === 'AU');

    const multFR = getDistanceMultiplier(homeGB, france);
    const multJP = getDistanceMultiplier(homeGB, japan);
    const multAU = getDistanceMultiplier(homeGB, aus);

    expect(multFR).toBeLessThan(multJP);
    expect(multJP).toBeLessThan(multAU);
  });

  test('distance multiplier returns fallback for missing coords', () => {
    const mult = getDistanceMultiplier(null, null);
    expect(mult).toBe(3);
  });
});

// ── Tourism & size scores ───────────────────────────────────────────────────

describe('Tourism Score', () => {
  test('France (more tourists than people) has low tourism score', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const score = getTourismScore(france);
    expect(score).toBeLessThan(5);
    expect(score).toBeGreaterThan(0);
  });

  test('North Korea (almost no tourists) hits the tourism cap', () => {
    const nk = sampleCountries.find(c => c.code === 'KP');
    const score = getTourismScore(nk);
    expect(score).toBe(TOURISM_CAP);
  });

  test('tourism score is capped at TOURISM_CAP', () => {
    const extreme = { population: 100000000, annual_tourists: 1 };
    const score = getTourismScore(extreme);
    expect(score).toBe(TOURISM_CAP);
  });
});

describe('Size Score', () => {
  test('larger countries get higher size scores', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const portugal = sampleCountries.find(c => c.code === 'PT');
    expect(getSizeScore(france)).toBeGreaterThan(getSizeScore(portugal));
  });

  test('tiny country gets low size score', () => {
    const va = sampleCountries.find(c => c.code === 'VA');
    expect(getSizeScore(va)).toBeLessThan(0.1);
  });
});

// ── Baseline ────────────────────────────────────────────────────────────────

describe('Baseline', () => {
  test('Germany from UK is reasonable (not 2 like before)', () => {
    const de = sampleCountries.find(c => c.code === 'DE');
    const baseline = getBaseline(de, homeGB, sampleCountries);
    expect(baseline).toBeGreaterThan(10);
    expect(baseline).toBeLessThan(50);
  });

  test('France from UK is close to Germany (not 10x different)', () => {
    const de = sampleCountries.find(c => c.code === 'DE');
    const fr = sampleCountries.find(c => c.code === 'FR');
    const baseDe = getBaseline(de, homeGB, sampleCountries);
    const baseFr = getBaseline(fr, homeGB, sampleCountries);
    const ratio = Math.max(baseDe, baseFr) / Math.min(baseDe, baseFr);
    expect(ratio).toBeLessThan(3); // Previously was 10x
  });

  test('Laos from UK is higher than old value of 3.8', () => {
    const la = sampleCountries.find(c => c.code === 'LA');
    const baseline = getBaseline(la, homeGB, sampleCountries);
    expect(baseline).toBeGreaterThan(20);
  });

  test('Australia from UK reflects being far away', () => {
    const au = sampleCountries.find(c => c.code === 'AU');
    const baseline = getBaseline(au, homeGB, sampleCountries);
    expect(baseline).toBeGreaterThan(40);
  });

  test('baseline respects floor', () => {
    const tiny = { code: 'XX', population: 100, annual_tourists: 100000, area_km2: 1, lat: 51, lng: 0 };
    const baseline = getBaseline(tiny, homeGB, sampleCountries);
    expect(baseline).toBeGreaterThanOrEqual(FLOOR);
  });

  test('baseline respects cap', () => {
    const extreme = { code: 'YY', population: 999999999, annual_tourists: 1, area_km2: 10000000, lat: -40, lng: 170 };
    const baseline = getBaseline(extreme, homeGB, sampleCountries);
    expect(baseline).toBeLessThanOrEqual(BASE_CAP);
  });

  test('microstate returns flat points', () => {
    const va = sampleCountries.find(c => c.code === 'VA');
    expect(getBaseline(va, homeGB, sampleCountries)).toBe(1);
  });
});

// ── Explorer ceiling ────────────────────────────────────────────────────────

describe('Explorer Ceiling', () => {
  test('inverse regional values: Oceania gets high value (sparse)', () => {
    const values = computeRegionalValues(sampleCountries);
    // Oceania should have a higher regional value than Asia (inverse of population)
    if (values['Oceania'] && values['Asia']) {
      expect(values['Oceania']).toBeGreaterThan(values['Asia']);
    }
  });

  test('explorer ceiling uses log scaling (not linear)', () => {
    const au = sampleCountries.find(c => c.code === 'AU');
    const baselineAu = getBaseline(au, homeGB, sampleCountries);
    const ceiling = getExplorerCeiling(baselineAu, au, sampleCountries);
    // With log scaling, Australia shouldn't have an astronomical ceiling
    expect(ceiling).toBeLessThan(500);
    expect(ceiling).toBeGreaterThan(0);
  });

  test('larger country gets higher ceiling than small country', () => {
    const us = sampleCountries.find(c => c.code === 'US');
    const pt = sampleCountries.find(c => c.code === 'PT');
    const usCeiling = getExplorerCeiling(50, us, sampleCountries);
    const ptCeiling = getExplorerCeiling(50, pt, sampleCountries);
    expect(usCeiling).toBeGreaterThan(ptCeiling);
  });

  test('microstate gets 0 explorer ceiling', () => {
    const va = sampleCountries.find(c => c.code === 'VA');
    expect(getExplorerCeiling(1, va, sampleCountries)).toBe(0);
  });
});

// ── Province exploration (Tiers 1 & 2) ─────────────────────────────────────

describe('Province Exploration', () => {
  const mockCountry = { code: 'US', population: 331002651 };
  const mockProvinces = [
    { code: 'US-CA', name: 'California', population: 39538223 },
    { code: 'US-TX', name: 'Texas', population: 29145505 },
    { code: 'US-FL', name: 'Florida', population: 21538187 },
    { code: 'US-NY', name: 'New York', population: 20201249 },
  ];

  test('no provinces visited = 0 points', () => {
    const result = calculateProvinceExploration(100, mockCountry, mockProvinces, [], [], []);
    expect(result.explorerPoints).toBe(0);
    expect(result.explored).toBe(0);
  });

  test('visiting one province earns proportional points', () => {
    const visited = [{ code: 'US-CA' }];
    const result = calculateProvinceExploration(100, mockCountry, mockProvinces, visited, [], []);
    expect(result.explorerPoints).toBeGreaterThan(0);
    expect(result.provinceBreakdown.find(p => p.code === 'US-CA').visited).toBe(true);
    expect(result.provinceBreakdown.find(p => p.code === 'US-TX').visited).toBe(false);
  });

  test('visiting all provinces earns up to ceiling', () => {
    const visited = mockProvinces.map(p => ({ code: p.code }));
    const result = calculateProvinceExploration(100, mockCountry, mockProvinces, visited, [], []);
    expect(result.explorerPoints).toBeGreaterThan(0);
    expect(result.explorerPoints).toBeLessThanOrEqual(100);
  });
});

// ── Tier 0 province exploration (issue #46) ────────────────────────────────

describe('Tier 0 Province Exploration', () => {
  const mockCountry = { code: 'US', population: 331002651 };
  const mockProvinces = [
    { code: 'US-CA', name: 'California', population: 39538223 },
    { code: 'US-WY', name: 'Wyoming', population: 576851 },
  ];
  const mockCities = [
    { id: 'c1', province_code: 'US-CA', city_type: 'major' },
    { id: 'c2', province_code: 'US-CA', city_type: 'major' },
  ];
  const mockExperiences = [
    { id: 'e1', province_code: 'US-CA', name: 'Golden Gate Bridge' },
    { id: 'e2', province_code: 'US-CA', name: 'Alcatraz Island' },
  ];

  test('unvisited province earns nothing', () => {
    const result = calculateTier0ProvinceExploration(100, mockCountry, mockProvinces, [], [], [], [], []);
    expect(result.explorerPoints).toBe(0);
    const ca = result.provinceBreakdown.find(p => p.code === 'US-CA');
    expect(ca.visited).toBe(false);
    expect(ca.earnedPoints).toBe(0);
  });

  test('visiting a province with no experiences/cities logged earns exactly 90% of x', () => {
    const visited = [{ code: 'US-CA' }];
    const result = calculateTier0ProvinceExploration(100, mockCountry, mockProvinces, visited, mockCities, [], mockExperiences, []);
    const ca = result.provinceBreakdown.find(p => p.code === 'US-CA');
    const x = (39538223 / 331002651) * 100;
    expect(ca.earnedPoints).toBeCloseTo(x * TIER0_VISIT_RATIO, 2);
  });

  test('logging all experiences earns the remaining 50% pool on top of the 90% baseline', () => {
    const visited = [{ code: 'US-CA' }];
    const result = calculateTier0ProvinceExploration(
      100, mockCountry, mockProvinces, visited, mockCities, [], mockExperiences, ['e1', 'e2'],
    );
    const ca = result.provinceBreakdown.find(p => p.code === 'US-CA');
    const x = (39538223 / 331002651) * 100;
    expect(ca.earnedPoints).toBeCloseTo(x * (TIER0_VISIT_RATIO + TIER0_EXPERIENCE_RATIO), 2);
    expect(ca.experiences.visited).toBe(2);
    expect(ca.experiences.earned).toBeCloseTo(x * TIER0_EXPERIENCE_RATIO, 2);
  });

  test('cities are a bonus on top of the 1.4x ceiling, pushing maxPoints above 1.4x', () => {
    const result = calculateTier0ProvinceExploration(100, mockCountry, mockProvinces, [], mockCities, [], mockExperiences, []);
    const ca = result.provinceBreakdown.find(p => p.code === 'US-CA');
    const x = (39538223 / 331002651) * 100;
    expect(ca.maxPoints).toBeCloseTo(x * 1.4 + 1.0, 2); // 2 major cities = 1.0 pt
  });

  test('city points logged count toward percentExplored but not toward country-level explorationPoints', () => {
    const visitedCities = [{ id: 'c1', province_code: 'US-CA', city_type: 'major' }];
    const result = calculateTier0ProvinceExploration(100, mockCountry, mockProvinces, [], mockCities, visitedCities, mockExperiences, []);
    const ca = result.provinceBreakdown.find(p => p.code === 'US-CA');
    expect(ca.cities.earned).toBe(0.5);
    expect(ca.earnedPoints).toBe(0.5); // city points folded into per-province earnedPoints for % explored
    expect(result.explorerPoints).toBe(0); // but excluded from the country-level total (avoids double count with calculateCityPoints)
  });

  test('experience value splits evenly regardless of experience count', () => {
    const threeExperiences = [
      { id: 'e1', province_code: 'US-WY', name: 'A' },
      { id: 'e2', province_code: 'US-WY', name: 'B' },
      { id: 'e3', province_code: 'US-WY', name: 'C' },
    ];
    const result = calculateTier0ProvinceExploration(100, mockCountry, mockProvinces, [], [], [], threeExperiences, ['e1']);
    const wy = result.provinceBreakdown.find(p => p.code === 'US-WY');
    const x = (576851 / 331002651) * 100;
    // pointsEach is rounded to 2dp in the implementation (round2)
    expect(wy.experiences.pointsEach).toBeCloseTo((x * TIER0_EXPERIENCE_RATIO) / 3, 2);
  });
});

describe('Tier 0 Subregion Bonus', () => {
  const mockCountry = { code: 'US', population: 331002651 };
  const mockProvinces = [
    { code: 'US-CA', name: 'California', population: 39538223, subregion: 'West' },
    { code: 'US-WY', name: 'Wyoming', population: 576851, subregion: 'West' },
    { code: 'US-NY', name: 'New York', population: 20201249, subregion: 'Northeast' },
  ];

  test('no bonus until every state in the sub-region is visited', () => {
    const result = calculateTier0SubregionBonus(100, mockCountry, mockProvinces, [{ code: 'US-CA' }]);
    const west = result.subregionBreakdown.find(s => s.name === 'West');
    expect(west.earned).toBe(false);
    expect(result.totalBonus).toBe(0);
  });

  test('visiting every state in a sub-region earns half the sum of their base x values', () => {
    const result = calculateTier0SubregionBonus(100, mockCountry, mockProvinces, [{ code: 'US-CA' }, { code: 'US-WY' }]);
    const west = result.subregionBreakdown.find(s => s.name === 'West');
    const xCA = (39538223 / 331002651) * 100;
    const xWY = (576851 / 331002651) * 100;
    expect(west.earned).toBe(true);
    expect(west.bonus).toBeCloseTo(0.5 * (xCA + xWY), 2);
    expect(result.totalBonus).toBeCloseTo(0.5 * (xCA + xWY), 2);
  });

  test('sub-region bonus trigger is visiting, not fully exploring', () => {
    const result = calculateTier0SubregionBonus(100, mockCountry, mockProvinces, [{ code: 'US-CA' }, { code: 'US-WY' }]);
    expect(result.totalBonus).toBeGreaterThan(0);
  });
});

// ── City exploration (Tier 3) ───────────────────────────────────────────────

describe('City Exploration (Tier 3)', () => {
  const mockCountry = { code: 'PT', population: 10196709 };
  const mockCities = [
    { id: '1', name: 'Lisbon', population: 504718 },
    { id: '2', name: 'Porto', population: 237591 },
    { id: '3', name: 'Vila Nova de Gaia', population: 186502 },
    { id: '4', name: 'Amadora', population: 175136 },
  ];

  test('no cities visited = 0 points', () => {
    const result = calculateCityExploration(50, mockCountry, mockCities, []);
    expect(result.explorerPoints).toBe(0);
    expect(result.explored).toBe(0);
  });

  test('visiting the largest city earns 0.5 pts', () => {
    const visited = [{ id: '1', name: 'Lisbon', population: 504718 }];
    const result = calculateCityExploration(50, mockCountry, mockCities, visited);
    expect(result.explorerPoints).toBe(0.5);
    expect(result.explored).toBe(1);
  });

  test('visiting all 4 cities earns 2.0 pts', () => {
    const result = calculateCityExploration(50, mockCountry, mockCities, mockCities);
    expect(result.explorerPoints).toBe(2.0);
    expect(result.explored).toBe(1);
  });
});

describe('calculateCityPoints (major vs Tier 0 additional)', () => {
  test('major cities are worth 0.5 pts each', () => {
    const cities = [{ id: '1', city_type: 'major' }, { id: '2', city_type: 'major' }];
    expect(calculateCityPoints(cities)).toBe(2 * CITY_MAJOR_POINTS);
  });

  test('Tier 0 additional cities are worth 0.25 pts each', () => {
    const cities = [{ id: '1', city_type: 'additional' }, { id: '2', city_type: 'additional' }];
    expect(calculateCityPoints(cities)).toBe(2 * CITY_ADDITIONAL_POINTS);
  });

  test('mixed major + additional cities sum correctly', () => {
    const cities = [{ id: '1', city_type: 'major' }, { id: '2', city_type: 'additional' }];
    expect(calculateCityPoints(cities)).toBeCloseTo(CITY_MAJOR_POINTS + CITY_ADDITIONAL_POINTS, 2);
  });

  test('cities with no city_type default to major (back-compat)', () => {
    const cities = [{ id: '1' }];
    expect(calculateCityPoints(cities)).toBe(CITY_MAJOR_POINTS);
  });
});

// ── getCityPercentage (legacy) ──────────────────────────────────────────────

describe('getCityPercentage', () => {
  test('city percentage = city_pop / country_pop', () => {
    const pct = getCityPercentage(2100000, 67390000);
    expect(pct).toBeCloseTo(0.0312, 3);
  });
});

// ── Breakdown helpers ───────────────────────────────────────────────────────

describe('Breakdown Helpers', () => {
  test('tourism difficulty labels', () => {
    expect(getTourismDifficulty(1000, 10000).label).toBe('Very easy to visit');
    expect(getTourismDifficulty(67000000, 90000000).label).toBe('Easy to visit');
    expect(getTourismDifficulty(7000000, 4800000).label).toBe('Moderate');
    expect(getTourismDifficulty(200000000, 6000000).label).toBe('Hard to visit');
    expect(getTourismDifficulty(164000000, 323000).label).toBe('Very hard to visit');
    expect(getTourismDifficulty(25000000, 5000).label).toBe('Extremely hard to visit');
  });

  test('size comparisons', () => {
    expect(getSizeComparison(500)).toBe('London');
    expect(getSizeComparison(3000)).toBe('Luxembourg');
    expect(getSizeComparison(250000)).toBe('the UK');
    expect(getSizeComparison(640000)).toBe('France');
    expect(getSizeComparison(10000000)).toBe('Australia');
  });

  test('formatNumber', () => {
    expect(formatNumber(500)).toBe('500');
    expect(formatNumber(67390000)).toBe('67.4 million');
    expect(formatNumber(1439323776)).toBe('1.4 billion');
  });
});

// ── Full country points ─────────────────────────────────────────────────────

describe('Full Country Points Calculation', () => {
  test('microstate returns flat points', () => {
    const va = sampleCountries.find(c => c.code === 'VA');
    const pts = calculateCountryPoints(va, homeGB, sampleCountries, {});
    expect(pts.tier).toBe('microstate');
    expect(pts.total).toBe(1);
    expect(pts.explorationPoints).toBe(0);
  });

  test('Tier 1 country (France) with provinces', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const allProvinces = [
      { code: 'FR-IDF', name: 'Île-de-France', population: 12278210, country_code: 'FR' },
      { code: 'FR-ARA', name: 'Auvergne-Rhône-Alpes', population: 8042936, country_code: 'FR' },
    ];
    const visitedProvinces = [{ code: 'FR-IDF' }];

    const pts = calculateCountryPoints(france, homeGB, sampleCountries, {
      allProvinces,
      visitedProvinces,
      visitedCities: [],
      allCities: [],
    });

    expect(pts.tier).toBe(1);
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.total).toBeCloseTo(pts.baseline + pts.explorationPoints, 2);
    expect(pts.provinceBreakdown).toBeDefined();
    expect(pts.provinceBreakdown).toHaveLength(2);
  });

  test('Tier 3 country with no cities returns baseline only', () => {
    const la = sampleCountries.find(c => c.code === 'LA');
    const pts = calculateCountryPoints(la, homeGB, sampleCountries, {
      allCities: [{ id: '1', name: 'Vientiane', population: 820000 }],
    });

    expect(pts.tier).toBe(3);
    expect(pts.explorationPoints).toBe(0);
    expect(pts.explored).toBe(0);
    expect(pts.total).toBe(pts.baseline);
  });

  test('includes breakdown when requested', () => {
    const la = sampleCountries.find(c => c.code === 'LA');
    const pts = calculateCountryPoints(la, homeGB, sampleCountries, {
      includeBreakdown: true,
      allCities: [],
    });

    expect(pts.breakdown).toBeDefined();
    expect(pts.breakdown.isMicrostate).toBe(false);
    expect(pts.breakdown.distance.km).toBeGreaterThan(8000);
    expect(pts.breakdown.tourism.difficulty).toBe('Moderate');
    expect(pts.breakdown.size.comparison).toContain('the UK');
  });

  test('Tier 0 country (US) end-to-end: visit + experiences + city + subregion bonus', () => {
    const us = sampleCountries.find(c => c.code === 'US');
    const allProvinces = [
      { code: 'US-CA', name: 'California', population: 39538223, subregion: 'West' },
      { code: 'US-WY', name: 'Wyoming', population: 576851, subregion: 'West' },
    ];
    const allExperiences = [
      { id: 'e1', province_code: 'US-CA', name: 'Golden Gate Bridge' },
      { id: 'e2', province_code: 'US-CA', name: 'Alcatraz Island' },
    ];
    const allCities = [{ id: 'c1', province_code: 'US-CA', city_type: 'major' }];

    const pts = calculateCountryPoints(us, homeGB, sampleCountries, {
      allProvinces,
      visitedProvinces: [{ code: 'US-CA' }, { code: 'US-WY' }],
      allExperiences,
      visitedExperienceIds: ['e1'],
      allCities,
      visitedCities: [{ id: 'c1', province_code: 'US-CA', city_type: 'major' }],
      includeBreakdown: true,
    });

    expect(pts.tier).toBe(0);
    expect(pts.subregionBonus).toBeGreaterThan(0);
    expect(pts.cityPoints).toBe(0.5);
    expect(pts.total).toBeCloseTo(
      pts.baseline + pts.explorationPoints + pts.cityPoints + pts.subregionBonus, 2,
    );
    expect(pts.breakdown.exploration.method).toBe('tier0');
  });
});

// ── Antarctica (issue #59) ───────────────────────────────────────────────────

describe('Antarctica', () => {
  const antarctica = {
    code: 'AQ', name: 'Antarctica', region: 'Antarctica',
    population: 1100, annual_tourists: 74000, area_km2: 14200000, lat: -90.0, lng: 0.0,
  };
  const allWithAq = [...sampleCountries, antarctica];

  test('is a normal Tier 3 destination (not a microstate)', () => {
    expect(getCountryTier('AQ')).toBe(3);
  });

  test('earns a substantial base score from size + distance alone', () => {
    const pts = calculateCountryPoints(antarctica, homeGB, allWithAq, { allCities: [], includeBreakdown: true });
    expect(pts.tier).toBe(3);
    expect(pts.baseline).toBeGreaterThan(25);
    expect(pts.baseline).toBeLessThanOrEqual(BASE_CAP);
    // No cities/provinces exist for it yet, so the total is just the baseline.
    expect(pts.total).toBe(pts.baseline);
  });

  test('scores higher the further you travel to reach it', () => {
    const argentina = {
      code: 'AR', name: 'Argentina', region: 'South America',
      population: 45195774, annual_tourists: 7399000, area_km2: 2780400, lat: -34.6, lng: -58.38,
    };
    const fromUK = getBaseline(antarctica, homeGB, allWithAq);
    const fromArgentina = getBaseline(antarctica, argentina, allWithAq);
    // Buenos Aires is far closer to the pole than London, so it's worth less there.
    expect(fromUK).toBeGreaterThan(fromArgentina);
  });

  test('the tourism ratio contributes almost nothing (no permanent population)', () => {
    // Far more tourists than residents → the difficulty score is ~0, by design.
    expect(getTourismScore(antarctica)).toBeLessThan(1);
  });

  test('breakdown explains the no-permanent-population scoring honestly', () => {
    const pts = calculateCountryPoints(antarctica, homeGB, allWithAq, { allCities: [], includeBreakdown: true });
    expect(pts.breakdown.tourism.difficulty).toBe('Extremely hard to reach');
    expect(pts.breakdown.tourism.explanation).toMatch(/no permanent population/i);
    // Never the absurd "very easy to visit" the raw ratio would otherwise print.
    expect(pts.breakdown.tourism.difficulty).not.toMatch(/easy/i);
  });
});

// ── Total travel points ─────────────────────────────────────────────────────

describe('Total Travel Points', () => {
  test('sums points across all visited countries', () => {
    const visited = [
      {
        country: sampleCountries.find(c => c.code === 'PT'),
        visitedCities: [{ id: '1', population: 504718 }],
        allCities: [{ id: '1', name: 'Lisbon', population: 504718 }],
      },
      {
        country: sampleCountries.find(c => c.code === 'JP'),
        allProvinces: [
          { code: 'JP-13', name: 'Tokyo', population: 14047594, country_code: 'JP' },
        ],
        visitedProvinces: [],
      },
    ];

    const result = calculateTotalTravelPoints(homeGB, sampleCountries, visited);

    expect(result.countries).toHaveLength(2);
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.countries[0].countryCode).toBe('PT');
    expect(result.countries[1].countryCode).toBe('JP');
  });

  test('no visited countries returns 0', () => {
    const result = calculateTotalTravelPoints(homeGB, sampleCountries, []);
    expect(result.totalPoints).toBe(0);
    expect(result.countries).toHaveLength(0);
  });
});
