// Style unlock thresholds (issue #69). Points are the same total the
// dashboard/leaderboard show (score engine + sub-region bonuses).
//
// The rungs follow the Travel Points trophy ladder (issue #52) — orbit at
// bronze (100), jetstream at silver (500), antiquity midway between the gold
// and diamond clubs (1500, Charlie's pick) — so "a big score" means the same
// thing across the app. Unlock order per the issue: atlas (default) → orbit →
// jetstream → antiquity.
//
// MUST stay in step with client/src/lib/styleUnlocks.js — same rule as
// STYLE_IDS ↔ the client theme registry.
export const STYLE_UNLOCK_POINTS = {
  atlas: 0,
  orbit: 100,
  jetstream: 500,
  antiquity: 1500,
};

export function isStyleUnlocked(style, totalPoints) {
  const required = STYLE_UNLOCK_POINTS[style];
  if (required === undefined) return false;
  return (Number(totalPoints) || 0) >= required;
}
