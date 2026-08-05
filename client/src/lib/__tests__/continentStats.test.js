/**
 * Unit tests for the Stats page's continent map (issue #75, phase 2).
 * Pure functions, no DB.
 */
import { describe, it, expect } from 'vitest';
import { computeContinentBreakdown, pieSliceAngles } from '../continentStats.js';

function country(code, subregion) {
  return { code, subregion };
}

describe('computeContinentBreakdown', () => {
  it('buckets baseline into Base and exploration/city/tier0-subregion into Experience', () => {
    const countryPoints = [
      {
        country: country('FR', 'Western Europe'),
        pts: { baseline: 10, explorationPoints: 3, cityPoints: 1, total: 14 },
      },
    ];
    const { continents } = computeContinentBreakdown(countryPoints);
    const europe = continents.find((c) => c.continent === 'Europe');
    expect(europe.base).toBe(10);
    expect(europe.experience).toBe(4);
    expect(europe.points).toBe(14);
  });

  it('includes a Tier 0 country\'s internal subregion bonus in Experience, not Base', () => {
    const countryPoints = [
      {
        country: country('US', 'Northern America'),
        pts: { baseline: 20, explorationPoints: 5, cityPoints: 2, subregionBonus: 3, total: 30 },
      },
    ];
    const { continents } = computeContinentBreakdown(countryPoints);
    const na = continents.find((c) => c.continent === 'North America');
    expect(na.base).toBe(20);
    expect(na.experience).toBe(10);
  });

  it('attributes global (UN M.49) subregion bonuses to the right continent\'s Experience slice', () => {
    const countryPoints = [
      { country: country('FR', 'Western Europe'), pts: { baseline: 10, explorationPoints: 0, cityPoints: 0, total: 10 } },
    ];
    const subregionBonuses = [
      { name: 'Western Europe', earned: 5 },
      { name: 'Southern Asia', earned: 0 }, // not earned — should be ignored
    ];
    const { continents } = computeContinentBreakdown(countryPoints, subregionBonuses);
    const europe = continents.find((c) => c.continent === 'Europe');
    const asia = continents.find((c) => c.continent === 'Asia');
    expect(europe.experience).toBe(5);
    expect(asia.experience).toBe(0);
  });

  it('excludes countries with no continent mapping (e.g. Antarctica) from any bucket, but keeps them in pointsByCountry', () => {
    const countryPoints = [
      { country: country('AQ', null), pts: { baseline: 5, total: 5 } },
    ];
    const { continents, pointsByCountry, totalPoints } = computeContinentBreakdown(countryPoints);
    expect(continents.every((c) => c.points === 0)).toBe(true);
    expect(pointsByCountry.AQ).toBe(5);
    expect(totalPoints).toBe(0);
  });

  it('computes each continent\'s share of the overall total, summing to 1', () => {
    const countryPoints = [
      { country: country('FR', 'Western Europe'), pts: { baseline: 30, total: 30 } },
      { country: country('JP', 'Eastern Asia'), pts: { baseline: 10, total: 10 } },
    ];
    const { continents } = computeContinentBreakdown(countryPoints);
    const europe = continents.find((c) => c.continent === 'Europe');
    const asia = continents.find((c) => c.continent === 'Asia');
    expect(europe.share).toBeCloseTo(0.75);
    expect(asia.share).toBeCloseTo(0.25);
    const shareSum = continents.reduce((sum, c) => sum + c.share, 0);
    expect(shareSum).toBeCloseTo(1);
  });

  it('handles zero total points without dividing by zero', () => {
    const { continents, totalPoints } = computeContinentBreakdown([]);
    expect(totalPoints).toBe(0);
    expect(continents.every((c) => c.share === 0)).toBe(true);
  });
});

describe('pieSliceAngles', () => {
  it('gives a single slice the full circle', () => {
    const [slice] = pieSliceAngles([1]);
    expect(slice.startAngle).toBe(0);
    expect(slice.endAngle).toBeCloseTo(2 * Math.PI);
  });

  it('splits two fractions proportionally, in order, with no gaps', () => {
    const slices = pieSliceAngles([0.25, 0.75]);
    expect(slices).toHaveLength(2);
    expect(slices[0].startAngle).toBe(0);
    expect(slices[0].endAngle).toBeCloseTo(Math.PI / 2);
    expect(slices[1].startAngle).toBeCloseTo(Math.PI / 2);
    expect(slices[1].endAngle).toBeCloseTo(2 * Math.PI);
  });

  it('adds an implicit remainder slice when fractions sum to less than 1', () => {
    const slices = pieSliceAngles([0.3]);
    expect(slices).toHaveLength(2);
    expect(slices[1].implicit).toBe(true);
    expect(slices[1].fraction).toBeCloseTo(0.7);
  });

  it('adds no remainder slice when fractions already sum to 1', () => {
    const slices = pieSliceAngles([0.4, 0.6]);
    expect(slices.some((s) => s.implicit)).toBe(false);
  });
});
