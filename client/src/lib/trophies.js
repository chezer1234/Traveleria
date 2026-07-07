// The Trophy Cabinet — pure trophy definitions + evaluator. No db access.
// Feature doc: docs/features/visual-refresh-atlas.md
// Visual reference: docs/designs/direction-final.html (Nº 01)
//
// `evaluateTrophies(stats)` consumes the stats object built by
// getTrophyStatusLocal in lib/queries.js:
//
//   home                 the user's home countries row, or null
//   allCountries         every countries row + distanceKm (km from home; null without home)
//   visited              visited countries rows + visited_at + distanceKm
//   subregions           distinct sub-region names among visited (same definition as the Map page stat)
//   continents           distinct continents among visited (lib/continents.js)
//   experiencesCompleted count of Tier-0 experiences the user has logged
//   totalPoints          total Travel Points (getUserScoreLocal)

import { getTourismDifficulty } from './points.js';
import { CONTINENTS, getContinent } from './continents.js';

// ── Tunables ─────────────────────────────────────────────────────────────────
// Charlie tunes these numbers after seeing the cabinet live — change freely.
export const EXPERIENCE_TARGET = 5;
export const SUBREGION_TIERS = { scout: 3, ranger: 5, legend: 10 };
export const DISTANCE_CLUB_KM = 10000;
export const POINTS_CLUB = 500;
export const CONTINENT_TARGET = 5;

// ── Island nations ───────────────────────────────────────────────────────────
// Curated list of island-nation ISO alpha-2 codes; every code here exists in
// server/src/db/seeds/01_countries.cjs. Shared-island states (Haiti/DR on
// Hispaniola, PNG on New Guinea) count — you still crossed water to get there.
export const ISLAND_NATIONS = new Set([
  // Europe
  'IS', 'MT', 'CY', 'IE', 'GB',
  // Asia
  'JP', 'PH', 'ID', 'LK', 'MV', 'SG', 'BH', 'BN', 'TL', 'TW',
  // Africa & Indian Ocean
  'MG', 'KM', 'CV', 'ST', 'SC', 'MU',
  // Caribbean
  'CU', 'JM', 'TT', 'BS', 'BB', 'GD', 'LC', 'VC', 'AG', 'DM', 'KN', 'HT', 'DO',
  // Oceania
  'NZ', 'FJ', 'WS', 'TO', 'TV', 'KI', 'FM', 'MH', 'PW', 'NR', 'SB', 'VU', 'PG',
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

// Oldest visit first; undated visits last (their order is not meaningful).
function byVisitDate(visited) {
  return [...visited].sort((a, b) => {
    if (!a.visited_at) return b.visited_at ? 1 : 0;
    if (!b.visited_at) return -1;
    return a.visited_at < b.visited_at ? -1 : a.visited_at > b.visited_at ? 1 : 0;
  });
}

// The visit that pushed the count of distinct keyFn values to n — i.e. the
// trip that earned a "reach N sub-regions/continents" trophy. Null when the
// count never reaches n.
function unlockingVisit(visited, keyFn, n) {
  const seen = new Set();
  for (const v of byVisitDate(visited)) {
    const key = keyFn(v);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (seen.size === n) return v;
  }
  return null;
}

// Difficulty reuses the points engine's tourism-ratio semantics exactly
// (points.js getTourismDifficulty: zero tourists, or ≥1000 residents per
// tourist ⇒ "Extremely hard to visit"). Do not invent a new boundary here.
function isExtremelyHard(country) {
  const label = getTourismDifficulty(
    Number(country.population),
    Number(country.annual_tourists),
  ).label;
  return label === 'Extremely hard to visit';
}

function hardRatioPhrase(country) {
  const tourists = Number(country.annual_tourists);
  if (!tourists) return 'almost nobody visits';
  const ratio = Math.round(Number(country.population) / tourists);
  return `1 tourist per ${ratio.toLocaleString()} residents`;
}

function formatKm(n) {
  return `${Math.round(n).toLocaleString()} km`;
}

// Scout / Ranger / Legend share one shape — only the target and medal differ.
function regionalTrophy(id, name, medal, icon, target) {
  return {
    id,
    name,
    medal,
    icon,
    requirement: `Reach ${target} sub-regions`,
    evaluate(stats) {
      const count = stats.subregions.length;
      if (count >= target) {
        const v = unlockingVisit(stats.visited, (c) => c.subregion, target);
        return {
          earned: true,
          earnedAt: (v && v.visited_at) || null,
          detail: count > target
            ? `${count} of ${target} — overachieved.`
            : `${count} sub-region${count === 1 ? '' : 's'} in the log.`,
        };
      }
      const left = target - count;
      return {
        earned: false,
        progress: { current: count, target },
        detail: `${left} more sub-region${left === 1 ? '' : 's'} unlocks ${medal}.`,
      };
    },
  };
}

// ── The cabinet ──────────────────────────────────────────────────────────────
// Ten trophies, in display order. evaluate(stats) returns
// { earned, detail, progress?: {current, target}, earnedAt?: string|null }.

export const TROPHIES = [
  {
    id: 'first-stamp',
    name: 'First Stamp',
    medal: 'gold',
    icon: '1',
    requirement: 'Log your first country',
    evaluate(stats) {
      const first = byVisitDate(stats.visited)[0];
      if (first) {
        return {
          earned: true,
          earnedAt: first.visited_at || null,
          detail: `${first.name} — the book is opened.`,
        };
      }
      return {
        earned: false,
        progress: { current: 0, target: 1 },
        detail: 'Log a country and the book opens.',
      };
    },
  },
  {
    id: 'island-hopper',
    name: 'Island Hopper',
    medal: 'gold',
    icon: '🏝',
    requirement: 'Visit your first island nation',
    evaluate(stats) {
      const island = byVisitDate(stats.visited).find((c) => ISLAND_NATIONS.has(c.code));
      if (island) {
        return { earned: true, earnedAt: island.visited_at || null, detail: island.name };
      }
      return {
        earned: false,
        progress: { current: 0, target: 1 },
        detail: `${ISLAND_NATIONS.size} island nations await.`,
      };
    },
  },
  {
    id: 'continental',
    name: 'Continental',
    medal: 'gold',
    icon: '🌍',
    requirement: `Set foot on ${CONTINENT_TARGET} continents`,
    evaluate(stats) {
      const count = stats.continents.length;
      const missing = CONTINENTS.filter((c) => !stats.continents.includes(c));
      if (count >= CONTINENT_TARGET) {
        const v = unlockingVisit(stats.visited, (c) => getContinent(c.subregion), CONTINENT_TARGET);
        return {
          earned: true,
          earnedAt: (v && v.visited_at) || null,
          detail: missing.length === 0
            ? `All ${CONTINENTS.length} — the whole map.`
            : `${count} of ${CONTINENTS.length} — ${missing.join(' and ')} waits.`,
        };
      }
      return {
        earned: false,
        progress: { current: count, target: CONTINENT_TARGET },
        detail: missing.length ? `${missing[0]} would be new ground.` : 'New ground awaits.',
      };
    },
  },
  regionalTrophy('regional-scout', 'Regional Scout', 'bronze', 'Ⅲ', SUBREGION_TIERS.scout),
  regionalTrophy('regional-ranger', 'Regional Ranger', 'silver', 'Ⅴ', SUBREGION_TIERS.ranger),
  regionalTrophy('regional-legend', 'Regional Legend', 'gold', 'Ⅹ', SUBREGION_TIERS.legend),
  {
    id: 'experience-collector',
    name: 'Experience Collector',
    medal: 'gold',
    icon: '✦',
    requirement: `Complete ${EXPERIENCE_TARGET} experiences`,
    evaluate(stats) {
      const n = stats.experiencesCompleted;
      if (n >= EXPERIENCE_TARGET) {
        return { earned: true, detail: `${n} experiences logged.` };
      }
      return {
        earned: false,
        progress: { current: n, target: EXPERIENCE_TARGET },
        detail: 'US and Chinese states hold the experiences.',
      };
    },
  },
  {
    id: 'ten-thousand-km-club',
    name: `The ${DISTANCE_CLUB_KM.toLocaleString()} km Club`,
    medal: 'gold',
    icon: '✈',
    requirement: `Visit a country ≥ ${DISTANCE_CLUB_KM.toLocaleString()} km from home`,
    evaluate(stats) {
      const farthest = stats.visited.reduce(
        (best, c) => (c.distanceKm != null && (!best || c.distanceKm > best.distanceKm) ? c : best),
        null,
      );
      if (farthest && farthest.distanceKm >= DISTANCE_CLUB_KM) {
        return {
          earned: true,
          earnedAt: farthest.visited_at || null,
          detail: `${farthest.name} · ${formatKm(farthest.distanceKm)}`,
        };
      }
      return {
        earned: false,
        progress: { current: farthest ? Math.round(farthest.distanceKm) : 0, target: DISTANCE_CLUB_KM },
        detail: !stats.home
          ? 'Set a home country to measure the journey.'
          : farthest
            ? `Farthest so far: ${farthest.name} · ${formatKm(farthest.distanceKm)}.`
            : 'Every journey starts at 0 km.',
      };
    },
  },
  {
    id: 'hard-mode',
    name: 'Hard Mode',
    medal: 'gold',
    icon: '⛰',
    requirement: 'Visit an "Extremely hard to visit" country',
    evaluate(stats) {
      const conquered = byVisitDate(stats.visited).find(isExtremelyHard);
      if (conquered) {
        return {
          earned: true,
          earnedAt: conquered.visited_at || null,
          detail: `${conquered.name} · ${hardRatioPhrase(conquered)}`,
        };
      }
      // Taunt with the nearest unvisited extremely-hard country (real engine
      // data, computed — never hardcoded).
      const visitedCodes = new Set(stats.visited.map((c) => c.code));
      const nearest = stats.allCountries
        .filter((c) => !visitedCodes.has(c.code) && isExtremelyHard(c))
        .reduce((best, c) => {
          if (!best) return c;
          if (c.distanceKm == null) return best;
          if (best.distanceKm == null) return c;
          return c.distanceKm < best.distanceKm ? c : best;
        }, null);
      return {
        earned: false,
        progress: { current: 0, target: 1 },
        detail: nearest
          ? `${nearest.name} awaits — ${hardRatioPhrase(nearest)}`
          : 'No extremely hard country left uncharted.',
      };
    },
  },
  {
    id: 'five-hundred-club',
    name: `The ${POINTS_CLUB} Club`,
    medal: 'gold',
    icon: 'Ⅾ', // Roman numeral 500, engraved
    requirement: `Pass ${POINTS_CLUB} total Travel Points`,
    evaluate(stats) {
      const pts = Number(stats.totalPoints) || 0;
      if (pts >= POINTS_CLUB) {
        return { earned: true, detail: `${pts.toLocaleString()} pts on the books.` };
      }
      return {
        earned: false,
        progress: { current: pts, target: POINTS_CLUB },
        detail: 'The ledger is still filling.',
      };
    },
  },
];

// Every trophy with its evaluation folded in — what Trophies.jsx renders.
export function evaluateTrophies(stats) {
  return TROPHIES.map((t) => ({ ...t, ...t.evaluate(stats) }));
}
