// Pure helpers for the Stats page's continent map (issue #75, phase 2):
// the pie-overlay's numbers and the pie-slice angle math. DB-free, same
// split as globalStats.js / pointsHistory.js — testable without a DB
// fixture. The map component (ContinentPointsMap.jsx) turns these numbers
// into SVG.
import { getContinent, CONTINENTS } from './continents.js';

function round2(n) { return Math.round(n * 100) / 100; }

// Two pots per country, matching the visible score breakdown fields in
// points.js: "Base" is baseline (distance x (tourism + danger) — how hard
// it was to get there); "Experience" is everything exploration-related
// (province/city points, Tier 0's internal subregion completion bonus) plus
// any global UN-subregion bonus earned in that continent. Together they sum
// to exactly the same total getUserScoreLocal reports — no bucket is
// dropped, so the pie's two slices always account for 100% of a continent's
// points.
//
// @param {{country: {code: string, subregion: string}, pts: {baseline: number, explorationPoints?: number, cityPoints?: number, subregionBonus?: number, total: number}}[]} countryPoints
// @param {{name: string, earned: number}[]} subregionBonuses - global (UN M.49) subregion bonuses, from calculateSubregionBonuses().subregions
export function computeContinentBreakdown(countryPoints, subregionBonuses = []) {
  const base = {};
  const experience = {};
  const pointsByCountry = {};

  for (const { country, pts } of countryPoints) {
    pointsByCountry[country.code] = pts.total;
    const continent = getContinent(country.subregion);
    if (!continent) continue; // Antarctica has no subregion mapping — same exclusion as Groups/leaderboard stats
    base[continent] = (base[continent] || 0) + pts.baseline;
    experience[continent] = (experience[continent] || 0)
      + (pts.explorationPoints || 0) + (pts.cityPoints || 0) + (pts.subregionBonus || 0);
  }

  for (const sr of subregionBonuses) {
    if (!sr.earned) continue;
    const continent = getContinent(sr.name);
    if (!continent) continue;
    experience[continent] = (experience[continent] || 0) + sr.earned;
  }

  const continents = CONTINENTS.map((continent) => {
    const b = round2(base[continent] || 0);
    const e = round2(experience[continent] || 0);
    return { continent, base: b, experience: e, points: round2(b + e) };
  });

  const totalPoints = round2(continents.reduce((sum, c) => sum + c.points, 0));
  const withShare = continents.map((c) => ({
    ...c,
    share: totalPoints > 0 ? c.points / totalPoints : 0,
  }));

  const maxCountryPoints = Math.max(0, ...Object.values(pointsByCountry));

  return { continents: withShare, totalPoints, pointsByCountry, maxCountryPoints };
}

// Turns an ordered list of fractions (expected to sum to <= 1; the
// remainder, if any, is the implicit "everything else" slice) into
// cumulative angle ranges for an SVG pie, 0 = 12 o'clock, clockwise.
// Kept separate from the SVG path string building (presentation detail) so
// the angle math itself is unit-testable.
export function pieSliceAngles(fractions) {
  let angle = 0;
  const slices = fractions.map((f) => {
    const startAngle = angle;
    angle += Math.max(0, f) * 2 * Math.PI;
    return { fraction: f, startAngle, endAngle: angle };
  });
  const remainder = Math.max(0, 1 - angle / (2 * Math.PI));
  if (remainder > 0) {
    slices.push({ fraction: remainder, startAngle: angle, endAngle: 2 * Math.PI, implicit: true });
  }
  return slices;
}
