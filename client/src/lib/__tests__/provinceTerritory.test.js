/**
 * Unit tests for the state/province territory battle (issue #46 Phase 2).
 * Pure adapter over computeTerritory — no DB.
 */
import { describe, it, expect } from 'vitest';
import { computeProvinceTerritory } from '../provinceTerritory.js';
import { OWNER } from '../territory.js';

function side(provinces, days = {}) {
  return {
    provinceBreakdown: provinces.map(([code, earnedPoints, visited = true, name]) => ({
      code, name: name || code, earnedPoints, visited,
    })),
    days,
  };
}

describe('computeProvinceTerritory', () => {
  it('awards a state only one user visited to that user', () => {
    const a = side([['US-CA', 20]]);
    const b = side([]);
    const r = computeProvinceTerritory(a, b, 'time');
    expect(r.ownerByCode['US-CA']).toBe(OWNER.A);
    expect(r.scoreA).toBe(20);
    expect(r.scoreB).toBe(0);
  });

  it('unvisited provinces (visited: false) are excluded even if present in the breakdown', () => {
    const a = side([['US-CA', 20, false]]);
    const b = side([['US-CA', 15]]);
    const r = computeProvinceTerritory(a, b, 'time');
    // A hasn't "visited" CA per the breakdown, so only B shows as visited.
    expect(r.ownerByCode['US-CA']).toBe(OWNER.B);
  });

  it('time mode: more days wins, owner banks their own earned points', () => {
    const a = side([['US-TX', 18]], { 'US-TX': 2 });
    const b = side([['US-TX', 12]], { 'US-TX': 9 });
    const r = computeProvinceTerritory(a, b, 'time');
    expect(r.ownerByCode['US-TX']).toBe(OWNER.B);
    expect(r.scoreB).toBe(12);
    expect(r.scoreA).toBe(0);
  });

  it('points mode: more earned points wins regardless of days', () => {
    const a = side([['US-TX', 18]], { 'US-TX': 2 });
    const b = side([['US-TX', 12]], { 'US-TX': 9 });
    const r = computeProvinceTerritory(a, b, 'points');
    expect(r.ownerByCode['US-TX']).toBe(OWNER.A);
    expect(r.scoreA).toBe(18);
  });

  it('equal metric on a shared state is contested', () => {
    const a = side([['US-NY', 10]], { 'US-NY': 4 });
    const b = side([['US-NY', 10]], { 'US-NY': 4 });
    const r = computeProvinceTerritory(a, b, 'time');
    expect(r.ownerByCode['US-NY']).toBe(OWNER.CONTESTED);
    expect(r.contestedCount).toBe(1);
  });

  it('perProvince exposes province_code/province_name instead of country_code/country_name', () => {
    const a = side([['US-CA', 20, true, 'California']]);
    const b = side([]);
    const r = computeProvinceTerritory(a, b, 'time');
    expect(r.perProvince[0].province_code).toBe('US-CA');
    expect(r.perProvince[0].province_name).toBe('California');
    expect(r.perProvince[0]).not.toHaveProperty('country_code');
  });

  it('no shared or visited provinces gives a 50/50 split', () => {
    const r = computeProvinceTerritory(side([]), side([]), 'time');
    expect(r.percentA).toBe(50);
    expect(r.scoreA).toBe(0);
    expect(r.scoreB).toBe(0);
  });
});
