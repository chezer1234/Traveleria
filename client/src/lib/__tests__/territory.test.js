/**
 * Unit tests for the territory comparison (issue #29). Pure function, no DB.
 */
import { describe, it, expect } from 'vitest';
import { computeTerritory, OWNER } from '../territory.js';

// Helper to build a side: countries with personalised totals + a days map.
function side(countries, days = {}) {
  return {
    countries: countries.map(([code, total, name]) => ({
      country_code: code,
      country_name: name || code,
      total,
    })),
    days,
  };
}

describe('computeTerritory', () => {
  it('awards a country only one user visited to that user', () => {
    const a = side([['FR', 30]]);
    const b = side([]);
    const r = computeTerritory(a, b, 'time');
    expect(r.ownerByCode.FR).toBe(OWNER.A);
    expect(r.scoreA).toBe(30);
    expect(r.scoreB).toBe(0);
    expect(r.percentA).toBe(100);
  });

  it('time mode: more days wins, owner banks own points', () => {
    const a = side([['TH', 40]], { TH: 3 });
    const b = side([['TH', 25]], { TH: 10 });
    const r = computeTerritory(a, b, 'time');
    expect(r.ownerByCode.TH).toBe(OWNER.B); // B spent 10 days vs 3
    expect(r.scoreB).toBe(25); // B banks B's own points
    expect(r.scoreA).toBe(0);
  });

  it('points mode: more points wins regardless of days', () => {
    const a = side([['TH', 40]], { TH: 3 });
    const b = side([['TH', 25]], { TH: 10 });
    const r = computeTerritory(a, b, 'points');
    expect(r.ownerByCode.TH).toBe(OWNER.A); // A has 40 pts vs 25
    expect(r.scoreA).toBe(40);
    expect(r.scoreB).toBe(0);
  });

  it('equal metric on a shared country is contested and counts for neither', () => {
    const a = side([['JP', 50]], { JP: 5 });
    const b = side([['JP', 50]], { JP: 5 });
    const r = computeTerritory(a, b, 'time');
    expect(r.ownerByCode.JP).toBe(OWNER.CONTESTED);
    expect(r.scoreA).toBe(0);
    expect(r.scoreB).toBe(0);
    expect(r.contestedCount).toBe(1);
    expect(r.percentA).toBe(50); // 0 vs 0 → even split
  });

  it('a shared country with zero days each is contested in time mode', () => {
    const a = side([['DE', 20]]); // no days logged
    const b = side([['DE', 22]]);
    const r = computeTerritory(a, b, 'time');
    expect(r.ownerByCode.DE).toBe(OWNER.CONTESTED);
  });

  it('computes overall winner and percentage split', () => {
    const a = side([['FR', 30], ['ES', 20]]);
    const b = side([['IT', 10]]);
    const r = computeTerritory(a, b, 'time');
    expect(r.scoreA).toBe(50);
    expect(r.scoreB).toBe(10);
    expect(r.winner).toBe(OWNER.A);
    expect(r.percentA).toBe(round1((50 / 60) * 100));
  });
});

function round1(n) {
  return Math.round(n * 10) / 10;
}
