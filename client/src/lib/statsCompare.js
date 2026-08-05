// Pure helper for the Stats page's comparison bars (issue #75, phase 3).
// DB-free, same split as continentStats.js/globalStats.js — testable
// without a DB fixture.

function round1(n) { return Math.round(n * 10) / 10; }

// Turns two non-negative values into a percentage split for a single
// blue-vs-red bar (same "tug of war" bar Territory/GroupBattle/StateBattle
// already use — see client/src/lib/territory.js's percentA). Both-zero is a
// neutral 50/50 rather than a divide-by-zero, same precedent as territory.js.
export function barSplit(valueA, valueB) {
  const sum = valueA + valueB;
  const pctA = sum > 0 ? (valueA / sum) * 100 : 50;
  return { pctA: round1(pctA), pctB: round1(100 - pctA) };
}

// The eight comparison stats from issue #75, in display order. `key` looks
// up the value on the objects getUserComparisonStatsLocal returns for each
// side; `rankStat: true` marks the one stat where a *smaller* number wins
// and a proportional bar would be misleading (see ComparisonStats.jsx).
export const COMPARISON_STATS = [
  { key: 'countriesVisited', label: 'Nations visited' },
  { key: 'subregionsExplored', label: 'Sub-regions explored' },
  { key: 'subregionPoints', label: 'Sub-region bonus points' },
  { key: 'citiesVisited', label: 'Cities been to' },
  { key: 'trophiesUnlocked', label: 'Trophies unlocked' },
  { key: 'experiencesDone', label: 'Experiences done' },
  { key: 'explorerPointsClaimed', label: 'Explorer points claimed' },
  { key: 'leaderboardRank', label: 'Leaderboard position', rankStat: true },
];
