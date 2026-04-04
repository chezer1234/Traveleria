/**
 * Unit tests for the Travel Points calculation engine.
 * Tests: tiers, regional multiplier, baseline, outlier correction,
 *        explorer ceiling, province exploration, city exploration, final score.
 */
const {
  getCountryTier,
  getRegionalMultiplier,
  calculateRawBaseline,
  calculateRegionalAverage,
  applyOutlierCorrection,
  getBaseline,
  getExplorerCeiling,
  getCityPercentage,
  calculateProvinceExploration,
  calculateCityExploration,
  calculateCountryPoints,
  calculateTotalTravelPoints,
  computeRegionalValues,
  resetCache,
} = require('../src/lib/points');

// Sample countries for testing
const sampleCountries = [
  { code: 'FR', name: 'France', region: 'Europe', population: 67390000, annual_tourists: 90000000, area_km2: 640679 },
  { code: 'DE', name: 'Germany', region: 'Europe', population: 83783942, annual_tourists: 39563000, area_km2: 357022 },
  { code: 'GB', name: 'United Kingdom', region: 'Europe', population: 67886011, annual_tourists: 39418000, area_km2: 242495 },
  { code: 'IS', name: 'Iceland', region: 'Europe', population: 341243, annual_tourists: 2343000, area_km2: 103000 },
  { code: 'KP', name: 'North Korea', region: 'Asia', population: 25778816, annual_tourists: 5000, area_km2: 120538 },
  { code: 'JP', name: 'Japan', region: 'Asia', population: 126476461, annual_tourists: 31882000, area_km2: 377975 },
  { code: 'AU', name: 'Australia', region: 'Oceania', population: 25499884, annual_tourists: 9466000, area_km2: 7741220 },
  { code: 'VA', name: 'Vatican City', region: 'Europe', population: 825, annual_tourists: 5000000, area_km2: 1 },
  { code: 'US', name: 'United States', region: 'North America', population: 331002651, annual_tourists: 79256000, area_km2: 9833517 },
  { code: 'BR', name: 'Brazil', region: 'South America', population: 212559417, annual_tourists: 6621000, area_km2: 8515767 },
  { code: 'PT', name: 'Portugal', region: 'Europe', population: 10196709, annual_tourists: 16000000, area_km2: 92090 },
];

beforeEach(() => {
  resetCache();
});

// ── Tier classification ──────────────────────────────────────────────────────

describe('Country Tiers', () => {
  test('Tier 1: top 10 by population', () => {
    expect(getCountryTier('US')).toBe(1);
    expect(getCountryTier('CN')).toBe(1);
    expect(getCountryTier('BR')).toBe(1);
    expect(getCountryTier('MX')).toBe(1);
  });

  test('Tier 2: ranks 11-30', () => {
    expect(getCountryTier('JP')).toBe(2);
    expect(getCountryTier('DE')).toBe(2);
    expect(getCountryTier('FR')).toBe(2);
    expect(getCountryTier('ES')).toBe(2);
  });

  test('Tier 3: all others', () => {
    expect(getCountryTier('PT')).toBe(3);
    expect(getCountryTier('IS')).toBe(3);
    expect(getCountryTier('AU')).toBe(3);
  });

  test('Microstates', () => {
    expect(getCountryTier('VA')).toBe('microstate');
    expect(getCountryTier('MC')).toBe('microstate');
    expect(getCountryTier('SG')).toBe('microstate');
  });
});

// ── Regional multiplier ──────────────────────────────────────────────────────

describe('Regional Multiplier', () => {
  test('same region returns 1', () => {
    expect(getRegionalMultiplier('Europe', 'Europe')).toBe(1);
    expect(getRegionalMultiplier('Asia', 'Asia')).toBe(1);
  });

  test('adjacent regions return 1.5', () => {
    expect(getRegionalMultiplier('Europe', 'Middle East')).toBe(1.5);
    expect(getRegionalMultiplier('North America', 'South America')).toBe(1.5);
  });

  test('far regions return higher multiplier', () => {
    expect(getRegionalMultiplier('Europe', 'Oceania')).toBe(4);
    expect(getRegionalMultiplier('South America', 'Asia')).toBe(4);
  });

  test('unknown pair defaults to 2.5', () => {
    expect(getRegionalMultiplier('Unknown', 'Unknown')).toBe(2.5);
  });
});

// ── Raw baseline ─────────────────────────────────────────────────────────────

describe('Raw Baseline Calculation', () => {
  test('France from Europe: (67M / 90M) * 1 = ~0.75', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const raw = calculateRawBaseline(france, 1);
    expect(raw).toBeCloseTo(0.749, 2);
  });

  test('Germany from Europe: (83M / 39M) * 1 = ~2.12', () => {
    const germany = sampleCountries.find(c => c.code === 'DE');
    const raw = calculateRawBaseline(germany, 1);
    expect(raw).toBeCloseTo(2.118, 2);
  });

  test('North Korea from Europe: (25M / 5000) * 2.5 = very high', () => {
    const nk = sampleCountries.find(c => c.code === 'KP');
    const raw = calculateRawBaseline(nk, 2.5);
    expect(raw).toBeGreaterThan(500);
  });

  test('country with 0 tourists returns 500', () => {
    const noTourists = { population: 1000000, annual_tourists: 0 };
    expect(calculateRawBaseline(noTourists, 1)).toBe(500);
  });
});

// ── Outlier correction ───────────────────────────────────────────────────────

describe('Outlier Correction', () => {
  test('normal value (2-500) passes through unchanged', () => {
    expect(applyOutlierCorrection(50, 25, 100000)).toBe(50);
    expect(applyOutlierCorrection(2, 25, 100000)).toBe(2);
    expect(applyOutlierCorrection(500, 25, 100000)).toBe(500);
  });

  test('value below 2 gets corrected using regional avg and area', () => {
    const corrected = applyOutlierCorrection(0.5, 25, 640679);
    expect(corrected).toBeGreaterThan(2);
    expect(corrected).toBeLessThan(500);
    expect(corrected).toBeCloseTo(70.2, 0);
  });

  test('value above 500 gets corrected', () => {
    const corrected = applyOutlierCorrection(5000, 20, 120538);
    expect(corrected).toBeGreaterThanOrEqual(2);
    expect(corrected).toBeLessThanOrEqual(500);
  });

  test('very small area results in minimum clamp of 2', () => {
    const corrected = applyOutlierCorrection(0.1, 0.5, 1);
    expect(corrected).toBe(2);
  });
});

// ── Regional average ─────────────────────────────────────────────────────────

describe('Regional Average', () => {
  test('calculates mean of baselines in normal range', () => {
    const europeanCountries = sampleCountries.filter(c => c.region === 'Europe');
    const avg = calculateRegionalAverage(europeanCountries, 1);
    expect(avg).toBeGreaterThan(0);
  });
});

// ── Explorer ceiling ─────────────────────────────────────────────────────────

describe('Explorer Ceiling', () => {
  test('computed regional values scale with population', () => {
    const values = computeRegionalValues(sampleCountries);
    // Europe should be anchored at ~50,000
    expect(values['Europe']).toBeCloseTo(50000, -3);
    // All regions should have positive values
    for (const v of Object.values(values)) {
      expect(v).toBeGreaterThanOrEqual(10000);
    }
  });

  test('ceiling = baseline * (area / regional_value)', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const baseline = getBaseline(france, 'Europe', sampleCountries);
    const ceiling = getExplorerCeiling(baseline, france, sampleCountries);
    expect(ceiling).toBeGreaterThan(0);
    expect(ceiling).toBeGreaterThan(baseline); // France is large enough
  });

  test('large country gets higher ceiling than small country', () => {
    const us = sampleCountries.find(c => c.code === 'US');
    const pt = sampleCountries.find(c => c.code === 'PT');
    const usCeiling = getExplorerCeiling(10, us, sampleCountries);
    const ptCeiling = getExplorerCeiling(10, pt, sampleCountries);
    expect(usCeiling).toBeGreaterThan(ptCeiling);
  });
});

// ── Province exploration (Tiers 1 & 2) ──────────────────────────────────────

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
    // California is ~12% of total mock population
    expect(result.explorerPoints).toBeGreaterThan(0);
    expect(result.provinceBreakdown.find(p => p.code === 'US-CA').visited).toBe(true);
    expect(result.provinceBreakdown.find(p => p.code === 'US-TX').visited).toBe(false);
  });

  test('visiting all provinces earns full ceiling', () => {
    const visited = mockProvinces.map(p => ({ code: p.code }));
    const result = calculateProvinceExploration(100, mockCountry, mockProvinces, visited, [], []);
    // Should be close to 100 (the ceiling) — not exact because these 4 states
    // don't make up 100% of the population
    expect(result.explorerPoints).toBeGreaterThan(0);
    expect(result.explorerPoints).toBeLessThanOrEqual(100);
  });
});

// ── City exploration (Tier 3) ────────────────────────────────────────────────

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

  test('visiting the largest city earns proportional points', () => {
    const visited = [{ id: '1', name: 'Lisbon', population: 504718 }];
    const result = calculateCityExploration(50, mockCountry, mockCities, visited);
    expect(result.explorerPoints).toBeGreaterThan(0);
    // Lisbon is ~45% of top-4 population
    expect(result.explored).toBeGreaterThan(0.4);
  });

  test('visiting all cities earns full ceiling', () => {
    const result = calculateCityExploration(50, mockCountry, mockCities, mockCities);
    expect(result.explorerPoints).toBeCloseTo(50, 1);
    expect(result.explored).toBeCloseTo(1.0, 3);
  });
});

// ── getCityPercentage (legacy, used by countries route) ──────────────────────

describe('getCityPercentage', () => {
  test('city percentage = city_pop / country_pop', () => {
    const pct = getCityPercentage(2100000, 67390000);
    expect(pct).toBeCloseTo(0.0312, 3);
  });
});

// ── Full country points ──────────────────────────────────────────────────────

describe('Full Country Points Calculation', () => {
  test('microstate returns flat points', () => {
    const va = sampleCountries.find(c => c.code === 'VA');
    const pts = calculateCountryPoints(va, 'Europe', sampleCountries, {});
    expect(pts.tier).toBe('microstate');
    expect(pts.total).toBe(1);
    expect(pts.explorationPoints).toBe(0);
  });

  test('Tier 2 country (France) with provinces', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const allProvinces = [
      { code: 'FR-IDF', name: 'Île-de-France', population: 12278210, country_code: 'FR' },
      { code: 'FR-ARA', name: 'Auvergne-Rhône-Alpes', population: 8042936, country_code: 'FR' },
    ];
    const visitedProvinces = [{ code: 'FR-IDF' }];

    const pts = calculateCountryPoints(france, 'Europe', sampleCountries, {
      allProvinces,
      visitedProvinces,
      visitedCities: [],
      allCities: [],
    });

    expect(pts.tier).toBe(2);
    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.total).toBeCloseTo(pts.baseline + pts.explorationPoints, 2);
    expect(pts.provinceBreakdown).toBeDefined();
    expect(pts.provinceBreakdown).toHaveLength(2);
  });

  test('Tier 3 country with no cities returns baseline only', () => {
    const portugal = sampleCountries.find(c => c.code === 'PT');
    const pts = calculateCountryPoints(portugal, 'Europe', sampleCountries, {
      allCities: [
        { id: '1', name: 'Lisbon', population: 504718 },
      ],
    });

    expect(pts.tier).toBe(3);
    expect(pts.explorationPoints).toBe(0);
    expect(pts.explored).toBe(0);
    expect(pts.total).toBe(pts.baseline);
  });

  test('Tier 1 country (US) with provinces and no cities', () => {
    const us = sampleCountries.find(c => c.code === 'US');
    const allProvinces = [
      { code: 'US-CA', name: 'California', population: 39538223, country_code: 'US' },
      { code: 'US-TX', name: 'Texas', population: 29145505, country_code: 'US' },
    ];

    const pts = calculateCountryPoints(us, 'Europe', sampleCountries, {
      allProvinces,
      visitedProvinces: [{ code: 'US-CA' }],
      visitedCities: [],
      allCities: [],
    });

    expect(pts.tier).toBe(1);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.provinceBreakdown).toHaveLength(2);
  });
});

// ── Total travel points ──────────────────────────────────────────────────────

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

    const result = calculateTotalTravelPoints('Europe', sampleCountries, visited);

    expect(result.countries).toHaveLength(2);
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.countries[0].countryCode).toBe('PT');
    expect(result.countries[1].countryCode).toBe('JP');
  });

  test('no visited countries returns 0', () => {
    const result = calculateTotalTravelPoints('Europe', sampleCountries, []);
    expect(result.totalPoints).toBe(0);
    expect(result.countries).toHaveLength(0);
  });
});
