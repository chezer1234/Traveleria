/**
 * Unit tests for the Travel Points calculation engine.
 * Tests: regional multiplier, baseline, outlier correction, exploration, final score.
 */
const {
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
];

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

describe('Outlier Correction', () => {
  test('normal value (2-500) passes through unchanged', () => {
    expect(applyOutlierCorrection(50, 25, 100000)).toBe(50);
    expect(applyOutlierCorrection(2, 25, 100000)).toBe(2);
    expect(applyOutlierCorrection(500, 25, 100000)).toBe(500);
  });

  test('value below 2 gets corrected using regional avg and area', () => {
    const corrected = applyOutlierCorrection(0.5, 25, 640679);
    // 25 * log10(640679/1000 + 1) = 25 * log10(641.679) = 25 * 2.807 = ~70.2
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
    // 0.5 * log10(1/1000 + 1) ≈ 0.5 * 0.0004 ≈ very small → clamped to 2
    expect(corrected).toBe(2);
  });
});

describe('Regional Average', () => {
  test('calculates mean of baselines in normal range', () => {
    const europeanCountries = sampleCountries.filter(c => c.region === 'Europe');
    const avg = calculateRegionalAverage(europeanCountries, 1);
    // Should be a positive number based on countries with baselines in 2-500
    expect(avg).toBeGreaterThan(0);
  });
});

describe('Area Multiplier & Total Country Points', () => {
  test('area_multiplier = max(area/50000, 2)', () => {
    expect(getAreaMultiplier(1)).toBe(2); // floor at 2
    expect(getAreaMultiplier(100000)).toBe(2); // 100000/50000 = 2
    expect(getAreaMultiplier(640000)).toBeCloseTo(12.8, 1);
    expect(getAreaMultiplier(9833517)).toBeCloseTo(196.67, 1);
  });

  test('total_country_points = baseline * area_multiplier', () => {
    const total = getTotalCountryPoints(30, 640000);
    // 30 * 12.8 = 384
    expect(total).toBeCloseTo(384, 0);
  });
});

describe('City Exploration', () => {
  test('city percentage = city_pop / country_pop', () => {
    // Paris (2.1M) in France (67M)
    const pct = getCityPercentage(2100000, 67390000);
    expect(pct).toBeCloseTo(0.0312, 3);
  });

  test('country explored is sum of city percentages', () => {
    const cities = [
      { population: 2100000 }, // Paris ~3.1%
      { population: 516000 },  // Lyon ~0.77%
      { population: 870000 },  // Marseille ~1.3%
    ];
    const explored = getCountryExplored(cities, 67390000);
    expect(explored).toBeCloseTo(0.0517, 3);
  });

  test('country explored is capped at 1.0', () => {
    // Give a tiny country huge cities to exceed 100%
    const cities = [
      { population: 500000 },
      { population: 600000 },
    ];
    const explored = getCountryExplored(cities, 800);
    expect(explored).toBe(1.0);
  });

  test('empty cities list returns 0', () => {
    expect(getCountryExplored([], 67390000)).toBe(0);
  });
});

describe('Full Country Points Calculation', () => {
  test('France from UK (Europe→Europe) with cities', () => {
    const france = sampleCountries.find(c => c.code === 'FR');
    const cities = [
      { population: 2100000 }, // Paris
      { population: 516000 },  // Lyon
      { population: 870000 },  // Marseille
    ];
    const pts = calculateCountryPoints(france, 'Europe', sampleCountries, cities);

    expect(pts.baseline).toBeGreaterThan(0);
    expect(pts.explorationPoints).toBeGreaterThan(0);
    expect(pts.explored).toBeGreaterThan(0);
    expect(pts.total).toBe(pts.baseline + pts.explorationPoints);
  });

  test('country with no cities visited returns baseline only', () => {
    const germany = sampleCountries.find(c => c.code === 'DE');
    const pts = calculateCountryPoints(germany, 'Europe', sampleCountries, []);

    expect(pts.explorationPoints).toBe(0);
    expect(pts.explored).toBe(0);
    expect(pts.total).toBe(pts.baseline);
  });
});

describe('Total Travel Points', () => {
  test('sums points across all visited countries', () => {
    const visited = [
      {
        country: sampleCountries.find(c => c.code === 'FR'),
        visitedCities: [{ population: 2100000 }],
      },
      {
        country: sampleCountries.find(c => c.code === 'JP'),
        visitedCities: [],
      },
    ];

    const result = calculateTotalTravelPoints('Europe', sampleCountries, visited);

    expect(result.countries).toHaveLength(2);
    expect(result.totalPoints).toBeGreaterThan(0);
    expect(result.countries[0].countryCode).toBe('FR');
    expect(result.countries[1].countryCode).toBe('JP');
  });

  test('no visited countries returns 0', () => {
    const result = calculateTotalTravelPoints('Europe', sampleCountries, []);
    expect(result.totalPoints).toBe(0);
    expect(result.countries).toHaveLength(0);
  });
});
