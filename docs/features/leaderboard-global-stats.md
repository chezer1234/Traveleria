# Leaderboard Global Stats

**Branch:** `claude/leaderboard-changes-h6uipk`
**Status:** In progress
**Issue:** #67

---

## 1. What It Is

A mini section at the bottom of the main leaderboard (`/leaderboard`) showing three things about the whole Traveleria community, not just the top 50 users:

1. **Most & least logged countries** — top 10 countries by number of distinct accounts that have visited them, and the 10 least-logged.
2. **Where everyone's been** — a compact choropleth world map, coloured by how many accounts have visited each country.
3. **Continent leaderboard** — every user's own personalised points (base + explorer + city/province points, computed against *their* home country) summed per country, rolled up by continent, then added across every account. Continents are ranked against each other. This is never broken out per-user — only the global total per continent is shown.

## 2. Why

Requested in issue #67. Charlie wants a sense of the community as a whole, not just individual rank — which countries are popular vs. overlooked, and which part of the world Traveleria's travellers collectively favour.

## 3. Data Model

No schema changes. Everything is computed from existing tables:

- `user_countries` — one row per (user, country) visit → visit counts per country.
- `countries.subregion` → continent, via the existing `client/src/lib/continents.js` mapping (`SUBREGION_TO_CONTINENT`, `CONTINENTS`, `getContinent`) — the same 6-continent grouping already used for the Groups feature's per-continent bars (`docs/features/groups.md` §3). Antarctica has no subregion mapping and is naturally excluded, same as Groups.
- Per-country points come from `calculateCountryPoints` (`client/src/lib/points.js`), the same engine every other page uses — no new formula.

This is entirely client-side, following the app's local-first architecture (`client/src/lib/queries.js` reads the synced local SQLite copy, no network round trip). No new server route — this mirrors Map, Groups, and Territory, none of which have a server-side equivalent. Only `/score` and `/leaderboard` keep server routes, for the existing parity tests (`e2e/tests/parity.spec.js`).

### Refactor: `computeAllUserTravelResults`

`getLeaderboardLocal` already loops over every user and every visited country to compute personalised totals — exactly the data the continent rollup needs (per-country `total` + the country's `subregion`). Rather than duplicating that loop, it's extracted into a private helper `computeAllUserTravelResults(db)` in `queries.js` that both `getLeaderboardLocal` (existing behaviour, unchanged output) and the new `getGlobalLeaderboardStatsLocal` build on. Pure extraction, no logic change — `getLeaderboardLocal`'s output is identical before and after.

### New function: `getGlobalLeaderboardStatsLocal(db)`

Returns:

```js
{
  mostVisited: [{ code, name, visitors }],   // top 10, desc, ties broken alphabetically
  leastVisited: [{ code, name, visitors }],  // 10 lowest, zero-visit countries first (alphabetical)
  moreZeroCount: number,                     // untouched countries beyond the 10 shown
  visitorsByCountry: { [code]: number },     // for the choropleth
  maxVisitors: number,
  continents: [{ continent, points, countriesLogged }], // sorted desc by points
}
```

### Least-visited tie handling

With 195 countries and a small userbase, most countries will sit at 0 visits — a real tie, not a ranking. The bottom-10 list shows 10 zero-visit countries alphabetically with a "+N more untouched" note, rather than implying a false order among them (if fewer than 10 countries are untouched, the list tops up with the lowest nonzero counts).

### Pure helpers: `client/src/lib/globalStats.js`

`rankMostLeastVisited(allCountries, visitorsByCountry)` and `visitorOpacity(count, maxCount)` are factored out as pure, DB-free functions (mirrors the existing `territory.js` / `trophies.js` pattern) so they're unit-testable without a DB fixture.

## 4. UI

New component `client/src/components/GlobalLeaderboardStats.jsx`, rendered at the bottom of `Leaderboard.jsx` inside the existing `max-w-4xl mx-auto` container, below the rankings table. Three stacked panels, following existing `bg-panel border border-hairline rounded-lg` conventions (same as `GroupBattle.jsx`'s continent bars):

1. **Most & least logged countries** — two side-by-side ranked lists (flag + name + visitor count).
2. **Where everyone's been** — a compact static world map (no zoom/pan — this is a glanceable summary, not a primary map view). Reuses `client/src/lib/geo.js` (`GEO_URL`, `getAlpha2`) and the `ComposableMap`/`Geographies`/`Geography` pattern from `Map.jsx`, with a continuous fill scale (`visitorOpacity`) instead of Map's binary visited/unvisited. Hover tooltip: "Country — N travellers". Legend shows light→full gradient with "fewer" / "more" labels.
3. **Continent leaderboard** — ranked list: rank, continent name, total points, countries logged. Same visual language as the existing rankings table (`smallcaps`, `tabular-nums`, `font-display font-black` for the point totals).

All colour comes from existing theme tokens (`var(--color-atlas)` via `color-mix`, same as `Map.jsx`'s `FILL` object) so it follows whichever of the three design systems (Atlas/Orbit/Jetstream) the user has picked, with no new bespoke CSS.

## 5. Open Questions

All resolved via Q&A before implementation:

| # | Question | Decision |
|---|----------|----------|
| OQ-1 | How to handle the many zero-visit ties in "least visited"? | 10 zero-visit countries shown alphabetically + "+N more untouched" note |
| OQ-2 | Choropleth: full interactive map or compact? | Compact static map, no zoom/pan |
| OQ-3 | Continent leaderboard: points only, or more context? | Points + distinct countries logged within that continent |

## 6. Browser Testing

Verified against a local server (file-based SQLite, no Docker) + Vite dev client, driven with Playwright (Chromium), signed in as a seeded test user (`charlie_travels`, GB) alongside two other accounts (`lewis_dad`/GB, `amy_wanders`/US) with overlapping and distinct country visits.

| # | Test | Result |
|---|------|--------|
| 1 | "The Community" section renders below the existing rankings table on `/leaderboard` | PASS |
| 2 | Most-logged list — correct counts per country across all 3 seeded accounts (e.g. France 3, China/Germany/Italy/Japan/Laos/Spain/Vietnam 2 each) | PASS — hand-verified against the seeded visit data |
| 3 | Least-logged list — 10 zero-visit countries shown alphabetically (Afghanistan → Australia) with a "+171 more untouched" footnote | PASS — 197 total countries − 16 distinct visited = 181 untouched, 10 shown + 171 more ✓ |
| 4 | Continent leaderboard — Asia 851 pts / 9 countries logged, Europe 191 pts / 7 countries logged, others 0 | PASS — country-logged counts match the seeded per-continent visit sets exactly; Asia leads because Laos/Mongolia/Turkmenistan/North Korea score far higher per the distance+tourism-difficulty formula, which is expected per the points system |
| 5 | Choropleth map — polygons render, colour scales with visitor count, hover tooltip | PASS — see note below on how this was verified |
| 6 | Page layout with the new section (no overlap with the fixed bottom nav bar) | PASS — confirmed via scrolled viewport screenshots; the fixed bottom nav only appeared to overlap in a `fullPage` capture, a Playwright screenshot artifact unrelated to this change |
| 7 | Unit tests (`globalStats.test.js`, 9 new cases) + full existing client (120) and server (125) suites | PASS |
| 8 | Lint + production build | PASS |

**Choropleth verification note:** this sandbox's outbound network policy blocks `cdn.jsdelivr.net` (confirmed via a direct `curl` CONNECT test — 403 at the proxy). That's an environment limitation, not a code issue — the pre-existing `/map` page (same `GEO_URL`) shows an identically blank map under the same sandbox. To actually verify the choropleth's rendering logic rather than stop at "it's blocked," the identical `world-atlas@2` TopoJSON was pulled from the npm registry (not blocked here) and served to the page via Playwright request interception, standing in for the CDN response. With real geometry available: 184 country polygons rendered, Western Europe and East/Southeast Asia clusters visibly shaded darker than the rest (matching the most-logged list), and hovering an unvisited country correctly showed `"Kazakhstan — 0 travellers"`. Both CDN and npm-registry serve the same package/version, so this exercised the real component code end-to-end. Neither production nor normal dev/CI environments have jsdelivr blocked (see `docs/features/world-map.md`).
