# Stats: continent map — pie overlay + choropleth (phase 2)

**Branch:** `claude/stats-update-issue-8n9nh4`
**Status:** Implemented
**Issue:** [#75 — Stats update](https://github.com/chezer1234/Traveleria/issues/75)

---

## 1. What It Is

A second section on the Stats page (below the points-over-time graph from
phase 1, see `docs/features/stats-points-history.md`): a large interactive
world map with two modes, toggled with a pill switcher:

- **By Continent** (default) — a small pie badge sits over each continent.
  Each pie defaults to showing that continent's **share of your overall
  total points**. Click a pie and it flips to that continent's own **Base
  vs. Experience split**; click again to flip back. Only one continent's
  pie is "expanded" at a time.
- **By Country** — the same map recoloured as a choropleth, shaded by your
  personal points earned in each country (not community visit counts —
  that's the separate, existing "Where everyone's been" section on the
  Leaderboard, `docs/features/leaderboard-global-stats.md`). Clicking a
  country navigates to its detail page, same as the main `/map`.

## 2. Why

The second bullet of issue #75: "a comparison to see the points logged per
continent... viewable on a large map... toggle to see a pie chart overlaid
onto each continent... click on that pie chart to see the proportion of
points gained within [it] that come from Experience vs Base points... also
be able to toggle a choropleth map."

## 3. Q&A (resolved before implementation)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Pie interaction semantics — confirm the read: default = continent's share of overall total (2 slices: this continent vs. rest); click = that continent's own Base vs Experience split; click again = back. | Confirmed as read. |
| Q2 | "Base vs Experience" field mapping — a country's total = baseline + explorationPoints + cityPoints (+ Tier 0's internal subregion bonus), floored at 1; separately, global UN-subregion bonus points aren't tied to one country. | Base = baseline. Experience = everything else (explorationPoints + cityPoints + Tier 0 subregion bonus + the global subregion bonus, attributed to whichever continent that subregion belongs to). Nothing left over — the two slices always sum to the continent's full total. |
| Q3 | Choropleth: full interactive (zoom/pan, click-through, like `/map`) or the compact static style already used on the Leaderboard? | Full interactive — same `ComposableMap`/`ZoomableGroup` setup as the main World Map page, just re-skinned with a continuous colour scale instead of binary visited/unvisited. |
| Q4 | Where does this live? | On the Stats page itself ("viewable on a large map **on the page**" — issue #75 is *about* the stats page), not the existing `/map` page and not a new toggle there. |

## 4. How It Works

### Data: `client/src/lib/continentStats.js` (pure, DB-free)

`computeContinentBreakdown(countryPoints, subregionBonuses)` buckets every
visited country's points into two pots per continent:

- **Base** = `pts.baseline` (distance × (tourism + danger) — how hard it
  was to get there, independent of what you did once there).
- **Experience** = `pts.explorationPoints + pts.cityPoints +
  (pts.subregionBonus || 0)` (province/city/experience points, plus Tier
  0's own internal sub-region completion bonus — a different, narrower
  feature than the global one below, see `docs/features/tier-0-nations.md`)
  **plus** any earned global UN-subregion bonus (`calculateSubregionBonuses`,
  `docs/features/bonus-points-subregions.md`) whose subregion maps to that
  continent via `getContinent()`.

Antarctica has no continent mapping (same exclusion already used by Groups
and the leaderboard's community stats) — its points still count in
`pointsByCountry` for the choropleth, just not in any continent's pie.

Each continent's `share` is `points / totalPoints` across all continents,
so the six pies' default-state slices always account for exactly 100% of
your points — nothing double-counted, nothing dropped.

`pieSliceAngles(fractions)` is the separate, presentation-adjacent pure
function that turns an ordered list of fractions into cumulative SVG angle
ranges (0 = 12 o'clock, clockwise), with an implicit trailing "remainder"
slice when the fractions don't sum to 1 (e.g. the share-of-total pie's
single "this continent" fraction — the rest of the circle is the implicit
"everything else" slice). Kept separate from SVG path-string building so
the angle math is unit-testable without touching the DOM.

### Query: `getUserContinentStatsLocal` (`client/src/lib/queries.js`)

Reuses the same `getUserTravelData` + `calculateCountryPoints` per-country
loop as `getUserCountriesLocal`/`getUserScoreLocal`, plus
`calculateSubregionBonuses` (same call `getUserScoreLocal` already makes)
for the global bonus attribution — no new formula, same numbers the rest of
the app already shows.

### UI: `client/src/components/ContinentPointsMap.jsx`

Hand-rolled SVG pie badges (`arcPath`, matching the app's no-charting-library
convention — see `PointsHistoryChart.jsx` from phase 1) rendered inside
`react-simple-maps` `<Marker>`s at approximate continent centroids. Reuses
`GEO_URL`/`getAlpha2` (`client/src/lib/geo.js`) and the same
`ComposableMap`/`ZoomableGroup`/`Geographies` setup as `Map.jsx`, so the
choropleth mode is genuinely the same interactive map, just recoloured.

Tooltip content is derived at render time from *what's hovered*
(`{ type: 'country' | 'continent', ... }`) plus the current `expanded`
state — not captured as a static string at hover time. That distinction
mattered: an earlier version stored the tooltip text directly in the
mouseenter handler, which went stale the moment you clicked a pie (the
click flips `expanded` and the pie's fractions re-render immediately, but
without a fresh `mouseenter` the tooltip kept showing the pre-click text).
Caught in browser testing — see §5.

Colour choices: Base = `var(--color-compass)`, Experience =
`var(--color-atlas)` (the same green Dashboard's exploration progress bars
already use for "exploration"), share-of-total = `var(--color-atlas)`
against a `var(--color-parchment-deep)` remainder — all theme tokens, so it
follows whichever of the three design systems the user has picked, same as
every other map in the app.

## 5. Browser Testing

Same setup as phase 1 (Playwright against Chromium, no Chrome tab tooling
in this remote environment; server on local file-based SQLite, client via
Vite). The world-atlas TopoJSON fetch is blocked by this sandbox's outbound
network policy (`cdn.jsdelivr.net` — documented in
`docs/features/leaderboard-global-stats.md`); worked around the same way
that doc did, by pulling the identical `world-atlas@2` package from the npm
registry (not blocked) and serving it via Playwright request interception.

| # | Test | Result |
|---|------|--------|
| 1 | Sign up, add 5 countries across 4 different continents (France/Europe, Mongolia+Japan/Asia, Brazil/South America, Kenya/Africa), visit `/stats` | PASS — pie badges render at the correct continent positions with plausible share proportions; Oceania and North America (unvisited) correctly show as fully "rest"-coloured (0% share) |
| 2 | Click a continent's pie (Europe) | PASS — pie flips from share-of-total to a full blue circle (Base 5.8, Experience 0 — France has no provinces/cities logged, correctly all-Base) |
| 3 | Tooltip after clicking, without moving the mouse first | **Caught a bug**: tooltip showed stale pre-click text ("Europe — 5.8 pts (2% of your total)") while the pie had already flipped to the Base/Experience view. Fixed by deriving tooltip text from hover target + current state at render time instead of a captured string. Re-tested: tooltip now correctly reads "Europe — Base 5.8 · Experience 0". |
| 4 | Toggle to "By Country" | PASS — full interactive choropleth renders, Brazil/Mongolia+Japan/Kenya shaded by relative points (Brazil darkest — furthest from the GB home country used in this test), France a faint sliver (opacity floor 0.12, correctly not invisible) |
| 5 | Hover a country in choropleth mode | PASS — "Algeria — 0 pts" tooltip for an unvisited country, hover stroke highlight |
| 6 | Unit tests (`continentStats.test.js`, 10 cases: Base/Experience bucketing, Tier 0 internal bonus placement, global subregion bonus continent attribution, Antarctica exclusion, share-sums-to-1, zero-total no-divide-by-zero, pie angle math for 1/2/partial-sum fraction lists) | PASS |
| 7 | Full client suite (152 tests) + full server suite (140 tests, unchanged by this phase) | PASS |
| 8 | Lint (scoped to changed files) + production build | PASS |

## 6. Open Questions / Follow-ups

- The user-comparison page (nations visited, subregions explored, cities,
  trophies, experiences, explorer points, leaderboard position, as
  blue-vs-red bars matching the existing Territory/GroupBattle pattern) —
  shipped as phase 3, see `docs/features/stats-comparison.md`.
- Continent centroids are approximate, chosen for legible badge placement
  rather than precise geographic centres (Oceania's badge, for instance,
  sits over Australia rather than the Pacific's true centroid, since that's
  where the landmass — and the eye — actually is).
