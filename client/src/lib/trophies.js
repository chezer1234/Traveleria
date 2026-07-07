// The Trophy Cabinet 1.6 — pure trophy definitions + evaluator. No db access.
// Feature doc: docs/features/trophies-1-6.md (issue #52)
// Artwork: lib/trophyArt.js · art sheet: docs/designs/trophies-1-6.html
//
// Forty-six trophies in three groups:
//   · seven LADDERS, five tiers each (bronze → silver → gold → diamond → platinum)
//   · six CONQUESTS — complete a continent, platinum only
//   · five SPECIALS — one-off honours
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
//   citiesVisited        count of the user's logged cities
//   totalPoints          total Travel Points (getUserScoreLocal)
//   countryPoints        [{code, name, points}] — per-nation totals from the score engine
//   totalAccounts        how many accounts exist (users_public)
//   visitorsByCountry    country_code → distinct accounts that have visited it
//
// Every 1.5 trophy id survives — either as a ladder rung with the same id or
// as a special — so nothing a user has earned disappears.

import { getTourismDifficulty } from './points.js';
import { CONTINENTS, getContinent } from './continents.js';

// ── Tunables ─────────────────────────────────────────────────────────────────
// Charlie tunes the ladder targets in LADDERS below — change freely.
export const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];
export const DISTANCE_CLUB_KM = 10000;
export const CENTURY_NATION_POINTS = 100;
export const RARE_VISIT_SHARE = 0.05;

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

function plural(n, word) {
  return `${word}${n === 1 ? '' : 's'}`;
}

function islandsVisited(stats) {
  return byVisitDate(stats.visited).filter((c) => ISLAND_NATIONS.has(c.code));
}

// ── The ladders ──────────────────────────────────────────────────────────────
// Seven categories × five tiers. `ids` pins legacy 1.5 trophy ids onto the
// rung with the same meaning, so earned history carries over.

export const LADDERS = [
  {
    key: 'points', title: 'Travel Points', shape: 'cup',
    targets: { bronze: 100, silver: 500, gold: 1000, diamond: 2000, platinum: 3000 },
    names: {
      bronze: 'The 100 Club', silver: 'The 500 Club', gold: 'The 1,000 Club',
      diamond: 'The 2,000 Club', platinum: 'The 3,000 Club',
    },
    ids: { silver: 'five-hundred-club' },
    requirement: (t) => `Pass ${t.toLocaleString()} total Travel Points`,
    current: (stats) => Number(stats.totalPoints) || 0,
    earnedDetail: (stats, current) => `${Math.round(current).toLocaleString()} pts on the books.`,
    lockedDetail: () => 'The ledger is still filling.',
  },
  {
    key: 'countries', title: 'Countries', shape: 'globe',
    targets: { bronze: 5, silver: 15, gold: 30, diamond: 60, platinum: 100 },
    names: {
      bronze: 'Wayfarer', silver: 'Voyager', gold: 'Globetrotter',
      diamond: 'World Wanderer', platinum: 'Centurion',
    },
    requirement: (t) => `Visit ${t} countries`,
    current: (stats) => stats.visited.length,
    earnedAt: (stats, target) => byVisitDate(stats.visited)[target - 1]?.visited_at || null,
    earnedDetail: (stats, current) => `${current} of ${stats.allCountries.length} nations logged.`,
    lockedDetail: (stats, current, target) =>
      `${target - current} more ${target - current === 1 ? 'country' : 'countries'} to go.`,
  },
  {
    key: 'continents', title: 'Continents', shape: 'range',
    targets: { bronze: 2, silver: 3, gold: 4, diamond: 5, platinum: 6 },
    names: {
      bronze: 'Second Shore', silver: 'Triple Landfall', gold: 'Four Corners',
      diamond: 'Continental', platinum: 'The Whole Map',
    },
    ids: { diamond: 'continental' },
    requirement: (t) => `Set foot on ${t} continents`,
    current: (stats) => stats.continents.length,
    earnedAt: (stats, target) => {
      const v = unlockingVisit(stats.visited, (c) => getContinent(c.subregion), target);
      return (v && v.visited_at) || null;
    },
    earnedDetail: (stats, current) => {
      const missing = CONTINENTS.filter((c) => !stats.continents.includes(c));
      return missing.length === 0
        ? `All ${CONTINENTS.length} — the whole map.`
        : `${current} of ${CONTINENTS.length} — ${missing.join(' and ')} waits.`;
    },
    lockedDetail: (stats) => {
      const missing = CONTINENTS.filter((c) => !stats.continents.includes(c));
      return missing.length ? `${missing[0]} would be new ground.` : 'New ground awaits.';
    },
  },
  {
    key: 'subregions', title: 'Sub-regions', shape: 'compass',
    targets: { bronze: 3, silver: 6, gold: 10, diamond: 15, platinum: 20 },
    names: {
      bronze: 'Regional Scout', silver: 'Regional Ranger', gold: 'Regional Legend',
      diamond: 'Regional Sovereign', platinum: 'Master of Regions',
    },
    ids: { bronze: 'regional-scout', silver: 'regional-ranger', gold: 'regional-legend' },
    requirement: (t) => `Reach ${t} sub-regions`,
    current: (stats) => stats.subregions.length,
    earnedAt: (stats, target) => {
      const v = unlockingVisit(stats.visited, (c) => c.subregion, target);
      return (v && v.visited_at) || null;
    },
    earnedDetail: (stats, current, target) => current > target
      ? `${current} of ${target} — overachieved.`
      : `${current} ${plural(current, 'sub-region')} in the log.`,
    lockedDetail: (stats, current, target) =>
      `${target - current} more ${plural(target - current, 'sub-region')} unlocks it.`,
  },
  {
    key: 'cities', title: 'Cities', shape: 'obelisk',
    targets: { bronze: 5, silver: 15, gold: 30, diamond: 60, platinum: 100 },
    names: {
      bronze: 'Street Level', silver: 'City Lights', gold: 'Urban Explorer',
      diamond: 'Metropolitan', platinum: 'Megalopolis',
    },
    requirement: (t) => `Log ${t} cities`,
    current: (stats) => Number(stats.citiesVisited) || 0,
    earnedDetail: (stats, current) => `${current.toLocaleString()} cities in the log.`,
    lockedDetail: () => 'Cities live on each country’s detail page.',
  },
  {
    key: 'islands', title: 'Island nations', shape: 'island',
    targets: { bronze: 1, silver: 3, gold: 5, diamond: 10, platinum: 15 },
    names: {
      bronze: 'Island Hopper', silver: 'Island Chain', gold: 'Archipelago',
      diamond: 'Atoll Collector', platinum: 'Sovereign of the Seas',
    },
    ids: { bronze: 'island-hopper' },
    requirement: (t) => (t === 1 ? 'Visit your first island nation' : `Visit ${t} island nations`),
    current: (stats) => islandsVisited(stats).length,
    earnedAt: (stats, target) => islandsVisited(stats)[target - 1]?.visited_at || null,
    earnedDetail: (stats, current, target) => {
      const nth = islandsVisited(stats)[target - 1];
      return current === 1 && nth ? nth.name : `${current} island ${plural(current, 'nation')} crossed.`;
    },
    lockedDetail: () => `${ISLAND_NATIONS.size} island nations await.`,
  },
  {
    key: 'experiences', title: 'Experiences', shape: 'torch',
    targets: { bronze: 1, silver: 5, gold: 15, diamond: 30, platinum: 60 },
    names: {
      bronze: 'First Story', silver: 'Experience Collector', gold: 'Memory Bank',
      diamond: 'Storyteller', platinum: 'A Thousand Tales',
    },
    ids: { silver: 'experience-collector' },
    requirement: (t) => (t === 1 ? 'Complete your first experience' : `Complete ${t} experiences`),
    current: (stats) => Number(stats.experiencesCompleted) || 0,
    earnedDetail: (stats, current) => `${current} ${plural(current, 'experience')} logged.`,
    lockedDetail: () => 'US and Chinese states hold the experiences.',
  },
];

function ladderTrophy(ladder, tier) {
  const target = ladder.targets[tier];
  return {
    id: (ladder.ids && ladder.ids[tier]) || `${ladder.key}-${tier}`,
    name: ladder.names[tier],
    medal: tier,
    shape: ladder.shape,
    group: 'ladder',
    ladderKey: ladder.key,
    ladderTitle: ladder.title,
    requirement: ladder.requirement(target),
    evaluate(stats) {
      const current = ladder.current(stats);
      if (current >= target) {
        return {
          earned: true,
          earnedAt: ladder.earnedAt ? ladder.earnedAt(stats, target) : null,
          detail: ladder.earnedDetail(stats, current, target),
        };
      }
      return {
        earned: false,
        progress: { current, target },
        detail: ladder.lockedDetail(stats, current, target),
      };
    },
  };
}

// ── Continental conquests ────────────────────────────────────────────────────
// Visit every country in a continent. Platinum only — that's the point.

const CONTINENT_GLYPHS = {
  Europe: 'EU', Asia: 'AS', Africa: 'AF',
  'North America': 'NA', 'South America': 'SA', Oceania: 'OC',
};

function conquestTrophy(continent) {
  const slug = continent.toLowerCase().replace(/\s+/g, '-');
  return {
    id: `complete-${slug}`,
    name: `Conqueror of ${continent}`,
    medal: 'platinum',
    shape: 'laurel',
    glyph: CONTINENT_GLYPHS[continent],
    group: 'conquest',
    requirement: `Visit every country in ${continent}`,
    evaluate(stats) {
      const inContinent = stats.allCountries.filter((c) => getContinent(c.subregion) === continent);
      const visitedIn = stats.visited.filter((c) => getContinent(c.subregion) === continent);
      const total = inContinent.length;
      const count = visitedIn.length;
      if (total > 0 && count >= total) {
        const last = byVisitDate(visitedIn)[count - 1];
        return {
          earned: true,
          earnedAt: (last && last.visited_at) || null,
          detail: `All ${total} nations — ${continent} is yours.`,
        };
      }
      const visitedCodes = new Set(visitedIn.map((c) => c.code));
      const missing = inContinent.filter((c) => !visitedCodes.has(c.code));
      return {
        earned: false,
        progress: { current: count, target: total },
        detail: missing.length
          ? `${missing.length} to go — ${missing[0].name} among them.`
          : 'No countries mapped to this continent.',
      };
    },
  };
}

// ── Special honours ──────────────────────────────────────────────────────────

export const SPECIALS = [
  {
    id: 'first-stamp',
    name: 'First Stamp',
    medal: 'bronze',
    shape: 'stamp',
    group: 'special',
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
    id: 'ten-thousand-km-club',
    name: `The ${DISTANCE_CLUB_KM.toLocaleString()} km Club`,
    medal: 'gold',
    shape: 'plane',
    group: 'special',
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
    shape: 'peak',
    group: 'special',
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
    id: 'century-nation',
    name: 'Century Nation',
    medal: 'diamond',
    shape: 'seal',
    glyph: '100',
    group: 'special',
    requirement: `Earn over ${CENTURY_NATION_POINTS} points from a single nation`,
    evaluate(stats) {
      const best = (stats.countryPoints || []).reduce(
        (top, c) => (!top || c.points > top.points ? c : top),
        null,
      );
      if (best && best.points > CENTURY_NATION_POINTS) {
        return {
          earned: true,
          detail: `${best.name} · ${Math.round(best.points).toLocaleString()} pts from one nation.`,
        };
      }
      return {
        earned: false,
        progress: { current: best ? Math.round(best.points) : 0, target: CENTURY_NATION_POINTS },
        detail: best
          ? `Deepest so far: ${best.name} · ${Math.round(best.points)} pts. Explore within it.`
          : 'Go deep, not just wide — provinces and cities stack points.',
      };
    },
  },
  {
    id: 'off-the-map',
    name: 'Off the Map',
    medal: 'diamond',
    shape: 'mapx',
    group: 'special',
    requirement: `Visit a nation fewer than ${RARE_VISIT_SHARE * 100}% of accounts have visited`,
    evaluate(stats) {
      const total = Number(stats.totalAccounts) || 0;
      const visitors = stats.visitorsByCountry || {};
      // Rare = under the share threshold, or you're the only account that has
      // ever been there (keeps the trophy reachable while the userbase is
      // small, when nothing can mathematically be under 5%).
      const rare = stats.visited
        .map((c) => ({ country: c, n: visitors[c.code] || 1 }))
        .filter(({ n }) => n === 1 || (total > 0 && n / total < RARE_VISIT_SHARE))
        .sort((a, b) => a.n - b.n)[0];
      if (rare) {
        const share = total > 0 ? (rare.n / total) * 100 : 0;
        return {
          earned: true,
          earnedAt: rare.country.visited_at || null,
          detail: rare.n === 1
            ? `${rare.country.name} — you're the only one who has been.`
            : `${rare.country.name} — only ${share.toFixed(1)}% of accounts have been.`,
        };
      }
      return {
        earned: false,
        progress: { current: 0, target: 1 },
        detail: 'Every nation in your log is well-trodden. Go somewhere nobody goes.',
      };
    },
  },
];

// ── The cabinet ──────────────────────────────────────────────────────────────
// All 46, in display order: ladders (by tier), conquests, specials.
// evaluate(stats) returns { earned, detail, progress?: {current, target},
// earnedAt?: string|null }.

export const CONQUESTS = CONTINENTS.map(conquestTrophy);

export const TROPHIES = [
  ...LADDERS.flatMap((ladder) => TIERS.map((tier) => ladderTrophy(ladder, tier))),
  ...CONQUESTS,
  ...SPECIALS,
];

// Every trophy with its evaluation folded in — what Trophies.jsx renders.
export function evaluateTrophies(stats) {
  return TROPHIES.map((t) => ({ ...t, ...t.evaluate(stats) }));
}

// The evaluated cabinet, grouped for display: one entry per ladder (rungs in
// tier order), then conquests, then specials.
export function evaluateCabinet(stats) {
  const all = evaluateTrophies(stats);
  return {
    all,
    ladders: LADDERS.map((l) => ({
      key: l.key,
      title: l.title,
      shape: l.shape,
      trophies: all.filter((t) => t.ladderKey === l.key),
    })),
    conquests: all.filter((t) => t.group === 'conquest'),
    specials: all.filter((t) => t.group === 'special'),
  };
}

// ── Cabinet-mode sort (issue #57) ───────────────────────────────────────────
// Sorting an already-earned subset of trophies for display. Undated trophies
// (conquests/specials with no natural earnedAt) sort after dated ones
// regardless of direction — there's no date to compare, not a date of zero.

export const SORT_OPTIONS = [
  { key: 'recent', label: 'Recently earned' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'tier', label: 'Tier' },
  { key: 'alpha', label: 'A–Z' },
];

function compareEarnedAt(a, b, ascending) {
  if (!a.earnedAt && !b.earnedAt) return a.name.localeCompare(b.name);
  if (!a.earnedAt) return 1;
  if (!b.earnedAt) return -1;
  if (a.earnedAt === b.earnedAt) return a.name.localeCompare(b.name);
  const cmp = a.earnedAt < b.earnedAt ? -1 : 1;
  return ascending ? cmp : -cmp;
}

export function sortTrophies(trophies, sortKey) {
  const list = [...trophies];
  switch (sortKey) {
    case 'oldest':
      return list.sort((a, b) => compareEarnedAt(a, b, true));
    case 'tier':
      return list.sort((a, b) => {
        const tierDiff = TIERS.indexOf(b.medal) - TIERS.indexOf(a.medal);
        return tierDiff !== 0 ? tierDiff : a.name.localeCompare(b.name);
      });
    case 'alpha':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'recent':
    default:
      return list.sort((a, b) => compareEarnedAt(a, b, false));
  }
}
