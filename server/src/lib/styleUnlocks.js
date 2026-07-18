// Style unlock thresholds (issue #69). Points are the same total the
// dashboard/leaderboard show (score engine + sub-region bonuses).
//
// The rungs mirror the Travel Points trophy ladder (issue #52) — bronze 100,
// silver 500, diamond 2000 — so "a big score" means the same thing across the
// app. Unlock order per the issue: atlas (default) → orbit → jetstream →
// antiquity.
//
// MUST stay in step with client/src/lib/styleUnlocks.js — same rule as
// STYLE_IDS ↔ the client theme registry.
export const STYLE_UNLOCK_POINTS = {
  atlas: 0,
  orbit: 100,
  jetstream: 500,
  antiquity: 2000,
};

export function isStyleUnlocked(style, totalPoints) {
  const required = STYLE_UNLOCK_POINTS[style];
  if (required === undefined) return false;
  return (Number(totalPoints) || 0) >= required;
}
