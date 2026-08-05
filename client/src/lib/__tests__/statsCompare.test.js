/**
 * Unit tests for the Stats page's comparison bars (issue #75, phase 3).
 * Pure functions, no DB.
 */
import { describe, it, expect } from 'vitest';
import { barSplit, COMPARISON_STATS } from '../statsCompare.js';

describe('barSplit', () => {
  it('splits proportionally to the two values', () => {
    expect(barSplit(75, 25)).toEqual({ pctA: 75, pctB: 25 });
  });

  it('gives a neutral 50/50 when both sides are zero, instead of dividing by zero', () => {
    expect(barSplit(0, 0)).toEqual({ pctA: 50, pctB: 50 });
  });

  it('gives the winner 100% when the other side is zero', () => {
    expect(barSplit(10, 0)).toEqual({ pctA: 100, pctB: 0 });
  });

  it('splits an exact tie 50/50', () => {
    expect(barSplit(5, 5)).toEqual({ pctA: 50, pctB: 50 });
  });
});

describe('COMPARISON_STATS', () => {
  it('lists exactly the eight stats from issue #75', () => {
    expect(COMPARISON_STATS).toHaveLength(8);
  });

  it('marks leaderboard position as the one rank-based (smaller-wins) stat', () => {
    const rankStats = COMPARISON_STATS.filter((s) => s.rankStat);
    expect(rankStats).toHaveLength(1);
    expect(rankStats[0].key).toBe('leaderboardRank');
  });
});
