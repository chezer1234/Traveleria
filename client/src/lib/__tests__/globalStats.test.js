/**
 * Unit tests for the leaderboard's global stats mini-section (issue #67).
 * Pure functions, no DB.
 */
import { describe, it, expect } from 'vitest';
import { rankMostLeastVisited, visitorOpacity } from '../globalStats.js';

function countries(codes) {
  return codes.map((code) => ({ code, name: code }));
}

describe('rankMostLeastVisited', () => {
  it('ranks most-visited descending, ties broken alphabetically', () => {
    const all = countries(['FR', 'DE', 'ES']);
    const visitors = { FR: 5, DE: 5, ES: 2 };
    const { mostVisited } = rankMostLeastVisited(all, visitors, 3);
    expect(mostVisited.map((c) => c.code)).toEqual(['DE', 'FR', 'ES']);
  });

  it('shows zero-visit countries alphabetically rather than an arbitrary tie order', () => {
    const all = countries(['ZW', 'AF', 'BJ']);
    const visitors = {};
    const { leastVisited, moreZeroCount } = rankMostLeastVisited(all, visitors, 2);
    expect(leastVisited.map((c) => c.code)).toEqual(['AF', 'BJ']);
    expect(leastVisited.every((c) => c.visitors === 0)).toBe(true);
    expect(moreZeroCount).toBe(1);
  });

  it('tops up with lowest nonzero counts when fewer than `limit` countries are untouched', () => {
    const all = countries(['FR', 'DE', 'ES']);
    const visitors = { FR: 10, DE: 3 }; // ES untouched
    const { leastVisited, moreZeroCount } = rankMostLeastVisited(all, visitors, 2);
    expect(leastVisited.map((c) => c.code)).toEqual(['ES', 'DE']);
    expect(moreZeroCount).toBe(0);
  });

  it('reports zero moreZeroCount when there are no untouched countries', () => {
    const all = countries(['FR', 'DE']);
    const visitors = { FR: 10, DE: 3 };
    const { moreZeroCount } = rankMostLeastVisited(all, visitors, 10);
    expect(moreZeroCount).toBe(0);
  });
});

describe('visitorOpacity', () => {
  it('returns 0 for an unvisited country', () => {
    expect(visitorOpacity(0, 10)).toBe(0);
  });

  it('returns 0 when nobody has visited anything (maxCount 0)', () => {
    expect(visitorOpacity(0, 0)).toBe(0);
  });

  it('returns full opacity at the most-visited country', () => {
    expect(visitorOpacity(10, 10)).toBe(1);
  });

  it('scales continuously between the floor and full opacity', () => {
    const low = visitorOpacity(1, 10);
    const high = visitorOpacity(5, 10);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(high);
    expect(high).toBeLessThan(1);
  });
});
