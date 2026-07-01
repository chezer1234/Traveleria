// State/province territory battle (issue #46 Phase 2). Adapts the existing
// country-level computeTerritory (issue #29) to compare two users' province
// ownership within ONE Tier 0 country, instead of countries across the world.
// Battles are only offered between two users who've both visited the country
// (see docs/features/tier-0-nations.md) — the caller enforces that; this
// module just computes the comparison from whatever provinceBreakdown data
// it's given.

import { computeTerritory } from './territory.js';

// side: { provinceBreakdown: [{code, name, earnedPoints, visited}], days: {[code]: number} }
// (provinceBreakdown is exactly what calculateCountryPoints returns for a
// Tier 0 country — see getUserCountryScoreLocal.)
function adapt(side) {
  return {
    countries: (side.provinceBreakdown || [])
      .filter((p) => p.visited)
      .map((p) => ({ country_code: p.code, country_name: p.name, total: p.earnedPoints })),
    days: side.days || {},
  };
}

export function computeProvinceTerritory(sideA, sideB, mode = 'time') {
  const result = computeTerritory(adapt(sideA), adapt(sideB), mode);

  return {
    ...result,
    perProvince: result.perCountry.map((c) => ({
      province_code: c.country_code,
      province_name: c.country_name,
      owner: c.owner,
      grade: c.grade,
      banked: c.banked,
      aPoints: c.aPoints,
      bPoints: c.bPoints,
      aDays: c.aDays,
      bDays: c.bDays,
      aVisited: c.aVisited,
      bVisited: c.bVisited,
    })),
  };
}
