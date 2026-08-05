/**
 * Unit tests for the Stats page's points-over-time graph (issue #75, phase
 * 1). Pure functions, no DB.
 */
import { describe, it, expect } from 'vitest';
import { buildPointsHistory, bucketHistoryByDay } from '../pointsHistory.js';

const HOME = { code: 'GB', name: 'United Kingdom', lat: 51.5, lng: -0.13 };

// FR: real Tier 1 code (uses provinces). VA: real microstate (flat points,
// no exploration). ZZ: not in any tier set → falls to Tier 3 (uses cities).
const FRANCE = {
  code: 'FR', name: 'France', subregion: 'Western Europe',
  population: 67000000, annual_tourists: 89000000, area_km2: 551695,
  lat: 48.85, lng: 2.35, advisory_level: 1,
};
const VATICAN = {
  code: 'VA', name: 'Vatican City', subregion: 'Southern Europe',
  population: 800, annual_tourists: 6000000, area_km2: 0.44,
  lat: 41.9, lng: 12.45, advisory_level: 1,
};
const ZZLAND = {
  code: 'ZZ', name: 'Zzland', subregion: 'Eastern Asia',
  population: 5000000, annual_tourists: 100000, area_km2: 50000,
  lat: 35, lng: 115, advisory_level: 2,
};

const ALL_COUNTRIES = [HOME, FRANCE, VATICAN, ZZLAND];

describe('buildPointsHistory', () => {
  it('returns an empty history when there are no events', () => {
    expect(buildPointsHistory(HOME, ALL_COUNTRIES, {}, [])).toEqual([]);
  });

  it('gives a flat-points country its full total the moment it is logged, no growth after', () => {
    const countryRefs = { VA: { country: VATICAN, allProvinces: [], allCities: [], allExperiences: [] } };
    const events = [{ type: 'country', country_code: 'VA', created_at: '2026-01-01T00:00:00Z' }];
    const history = buildPointsHistory(HOME, ALL_COUNTRIES, countryRefs, events);
    expect(history).toHaveLength(1);
    expect(history[0].totalPoints).toBe(1); // VA's flat MICROSTATE_POINTS value
  });

  it('runs chronologically regardless of input order, and totals only rise as provinces are added', () => {
    const paris = { code: 'FR-75', name: 'Paris', population: 2000000 };
    const lyon = { code: 'FR-69', name: 'Lyon', population: 500000 };
    const countryRefs = {
      FR: { country: FRANCE, allProvinces: [paris, lyon], allCities: [], allExperiences: [] },
    };
    // Deliberately out of chronological order — the function must sort by created_at.
    const events = [
      { type: 'province', country_code: 'FR', ref_id: 'FR-69', created_at: '2026-03-01T00:00:00Z' },
      { type: 'country', country_code: 'FR', created_at: '2026-01-01T00:00:00Z' },
      { type: 'province', country_code: 'FR', ref_id: 'FR-75', created_at: '2026-02-01T00:00:00Z' },
    ];
    const history = buildPointsHistory(HOME, ALL_COUNTRIES, countryRefs, events);
    expect(history.map((h) => h.date)).toEqual([
      '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z', '2026-03-01T00:00:00Z',
    ]);
    // Strictly non-decreasing — visiting more of a country never loses points.
    expect(history[1].totalPoints).toBeGreaterThanOrEqual(history[0].totalPoints);
    expect(history[2].totalPoints).toBeGreaterThan(history[1].totalPoints);
  });

  it('sums running totals across multiple countries', () => {
    const countryRefs = {
      VA: { country: VATICAN, allProvinces: [], allCities: [], allExperiences: [] },
      ZZ: { country: ZZLAND, allProvinces: [], allCities: [], allExperiences: [] },
    };
    const events = [
      { type: 'country', country_code: 'VA', created_at: '2026-01-01T00:00:00Z' },
      { type: 'country', country_code: 'ZZ', created_at: '2026-01-02T00:00:00Z' },
    ];
    const history = buildPointsHistory(HOME, ALL_COUNTRIES, countryRefs, events);
    expect(history[1].totalPoints).toBeGreaterThan(history[0].totalPoints);
  });

  it('skips events for a country with no reference data instead of throwing', () => {
    const events = [{ type: 'country', country_code: 'XX', created_at: '2026-01-01T00:00:00Z' }];
    expect(buildPointsHistory(HOME, ALL_COUNTRIES, {}, events)).toEqual([]);
  });

  it('drops events with a missing or unparseable created_at (pre-migration local rows) instead of corrupting the sort', () => {
    const countryRefs = { VA: { country: VATICAN, allProvinces: [], allCities: [], allExperiences: [] } };
    const events = [
      { type: 'country', country_code: 'VA', created_at: null },
      { type: 'country', country_code: 'VA', created_at: 'not-a-date' },
    ];
    expect(buildPointsHistory(HOME, ALL_COUNTRIES, countryRefs, events)).toEqual([]);
  });
});

describe('bucketHistoryByDay', () => {
  it('keeps the last value logged on each calendar day', () => {
    const history = [
      { date: '2026-01-01T09:00:00Z', totalPoints: 5 },
      { date: '2026-01-01T18:00:00Z', totalPoints: 8 },
      { date: '2026-01-02T09:00:00Z', totalPoints: 12 },
    ];
    expect(bucketHistoryByDay(history)).toEqual([
      { date: '2026-01-01', totalPoints: 8 },
      { date: '2026-01-02', totalPoints: 12 },
    ]);
  });

  it('handles an empty history', () => {
    expect(bucketHistoryByDay([])).toEqual([]);
  });
});
