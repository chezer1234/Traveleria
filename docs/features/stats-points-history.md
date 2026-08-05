# Stats: points-over-time graph (phase 1)

**Branch:** `claude/stats-update-issue-8n9nh4`
**Status:** Implemented
**Issue:** [#75 — Stats update](https://github.com/chezer1234/Traveleria/issues/75)

---

## 1. What It Is

A new **Stats** sub-tab under Overview (alongside Dashboard, Trophies, Map,
Settings) showing a line graph of your cumulative Travel Points over the
history of the app, plus the current total and how many days it's spanned.

This is **phase 1 of 3** from issue #75. The full issue also asked for a
continent-comparison map with a pie-chart overlay that toggles into a
choropleth, and a user-comparison page with blue-vs-red bar charts (the
existing Territory/GroupBattle battle pattern) for stats like nations
visited, cities been to, trophies unlocked, and leaderboard position.
Charlie's call: phase this — points-over-time first, since it's the most
self-contained. The map and comparison pieces are separate follow-up issues.

## 2. Why

Requested in issue #75 — Charlie wants to see progress, not just a static
total. "A graph of your points as you've logged them and over time
throughout the app's history."

## 3. Q&A (resolved before implementation)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Phase the whole issue, or one big PR? | Phase it. Points-over-time first (most contained, reuses no new interaction patterns). |
| Q2 | Graph axis: `created_at` (when logged in the app) or `visited_at` (actual travel date, optional/often null)? | `created_at` — matches the issue's own wording ("as you've logged them"), and is always populated where `visited_at` frequently isn't. |
| Q3 | Where does the page live — new top-level nav entry, or fold into an existing page? | New sub-tab under **Overview**, alongside Dashboard/Trophies/Map/Settings — not folded into Dashboard, not a new top-level tab bar entry. |

### Mid-implementation discovery: `created_at` wasn't synced to the client at all

The local-first sync layer (`docs/db-speed.md`) only ever carried
`visited_at` for `user_countries` / `user_cities` / `user_provinces` /
`user_province_experiences` — the snapshot route, the changes feed, and the
client's local SQLite schema (`client/src/db/worker.js`) never selected or
stored `created_at`, even though the column has existed on the server table
since it was created. This surfaced as `SQLITE_ERROR: no such column:
created_at` the first time the Stats page tried to query it.

**Decision:** extend the sync layer properly rather than fall back to
`visited_at` (which would silently drop undated visits from the graph).
Scope confirmed with Charlie — see §4.

## 4. How It Works

### Sync layer changes (new — not originally scoped, see above)

- `server/src/routes/users.js` — the four "did you log this" insert routes
  (`POST /countries`, `/cities`, `/provinces`, `/province-experiences`, plus
  the auto-created province row inside the experiences route) now stamp
  `created_at: new Date().toISOString()` explicitly on the row, rather than
  leaving it to the column's DB default. This matters because the *same*
  row object is echoed into `_changes.row_json` — if the timestamp came from
  a DB default, the value written to `user_countries` and the value synced
  to clients could technically diverge.
- `server/src/routes/snapshot.js` — `created_at` added to the SELECT column
  list for the same four tables (cold-boot / full-resync payload).
- `client/src/db/worker.js` — `created_at TEXT` added to the four tables'
  `CREATE TABLE` statements, `TABLE_COLUMNS` (used by both the changes-feed
  apply path and snapshot bulk-insert), and an idempotent `ALTER TABLE ...
  ADD COLUMN` for local DBs that already exist (same pattern as the
  existing `subregion`/`advisory_level`/etc. additions — no destructive
  wipe needed).
- `client/src/lib/mutations.js` — the four optimistic-write helpers
  (`addCountryOptimistic`, `addCityOptimistic`, `addProvinceOptimistic`,
  `addProvinceExperienceOptimistic`) now also insert a local
  `new Date().toISOString()` at write time, so the graph updates instantly
  rather than waiting for the next sync poll. Any clock skew between the
  client's optimistic timestamp and the server's authoritative one self-heals
  on the next poll (`INSERT OR REPLACE`, same id).
- **Not touched:** `user_country_visits` / `user_province_visits` (time-log
  "days spent" entries) and `user_subregions` — points don't depend on
  these, so they're irrelevant to the graph.
- **Known limitation:** rows written before this change keep whatever
  `created_at` the DB default already gave them (still present, just in
  SQLite's default datetime format rather than ISO 8601) — those still sort
  and parse correctly. Rows synced to a client *before* this change, sitting
  in an already-hydrated local DB, backfill as `NULL` until that client's
  next full resync; `buildPointsHistory` skips events it can't date rather
  than corrupt the sort (see below).

### Replay engine: `client/src/lib/pointsHistory.js`

Pure, DB-free (same split as `globalStats.js` / `territory.js`). Rather than
invent a second "how many points did this event add" formula that has to be
kept in sync with `points.js` forever, `buildPointsHistory` **replays**
every logged event in chronological order and re-runs the existing
`calculateCountryPoints` after each one:

1. Every logged country/province/city/experience is a "point event"
   (`{ type, country_code, ref_id?, created_at }`).
2. Events are sorted by `created_at` (events with a missing/unparseable
   date are dropped first — see the known limitation above).
3. Walking through in order, a per-country running state
   (`visitedProvinces` / `visitedCities` / `visitedExperienceIds`) grows as
   each event is applied, and `calculateCountryPoints` is re-run for just
   that country. The delta from its previous total is added to a running
   grand total.
4. Each event produces one `{ date, totalPoints }` point.

This means the graph is *exactly* consistent with what Dashboard/CountryDetail
show — no separate formula to drift out of sync with a future points
rebalance. `bucketHistoryByDay` then collapses same-day events down to one
point (the day's final total) for a cleaner line.

### Query: `getUserPointsHistoryLocal` (`client/src/lib/queries.js`)

Gathers the four event types for a user's visited countries (with joins
back to `provinces`/`cities`/`province_experiences` for `country_code`) plus
each visited country's static reference data (`allProvinces`/`allCities`/
`allExperiences` — doesn't change over time, only what's *visited* within it
does), then hands it all to `buildPointsHistory`.

### UI

- `client/src/pages/Stats.jsx` — total points, days spanned, first-logged
  date, and the chart. Empty state ("Log a country to start your points
  history") links to Add Countries, matching Dashboard's empty state.
- `client/src/components/PointsHistoryChart.jsx` — hand-rolled inline SVG
  line chart (no charting library in this codebase — same approach as the
  hand-rolled map SVGs). X is a genuine time scale (not point index), so a
  long gap between trips shows as a flat stretch rather than evenly-spaced
  steps. Hover shows a crosshair + tooltip with the date and running total.
- `client/src/lib/navGroups.js` / `NavIcons.jsx` — new `/stats` sub-tab
  under the Overview group, with a new chart-line icon.

## 5. Browser Testing

No Chrome tab tooling in this remote environment — verified with Playwright
against Chromium instead, driving the actual dev stack (server on a local
file-based SQLite, no Docker/Turso; client via Vite with `VITE_API_URL`
pointed at it).

| # | Test | Result |
|---|------|--------|
| 1 | Sign up, add 3 countries (France/Mongolia/Japan), visit `/stats` | PASS — total (111.4) matches the sum shown on Dashboard exactly |
| 2 | Stats sub-tab appears in the Overview sub-tab strip, alongside Dashboard/Trophies/Map/Settings | PASS |
| 3 | Chart with all events on the same day | PASS — single point, correct total, no crash |
| 4 | Chart with events spread across real distinct days (backdated `created_at` directly in the server DB, then signed in from a clean browser context so the snapshot pulled the real spread) | PASS — 3 visible steps, correct dates (1 Jun / 10 Jul / 5 Aug 2026), line + area render correctly, monotonically increasing |
| 5 | Hover tooltip + crosshair | PASS — "10 Jul 2026 · 56.6 pts" rendered at the correct point |
| 6 | Empty state (brand-new user, zero countries) | PASS — "Log a country to start your points history" + link to Add Countries |
| 7 | Unit tests (`pointsHistory.test.js`, 9 cases: empty input, flat-points country, chronological-regardless-of-input-order, multi-country summing, missing-refs defensiveness, missing/unparseable `created_at` defensiveness, day-bucketing) | PASS |
| 8 | Full client suite (142 tests) + full server suite (140 tests) | PASS |
| 9 | Lint + production build | PASS (lint scoped to changed files — a pre-existing, unrelated `eslint .` failure exists project-wide on this branch and on a clean checkout alike, confirmed via `git stash`) |

## 6. Open Questions / Follow-ups

- The continent-comparison map (pie-chart overlay toggling to a choropleth,
  drill-down into base vs. experience points per continent) — shipped as
  phase 2, see `docs/features/stats-continent-map.md`.
- The user-comparison page (nations visited, subregions explored, cities,
  trophies, experiences, explorer points, leaderboard position, as
  blue-vs-red bars) — shipped as phase 3, see `docs/features/stats-comparison.md`.
- Pre-migration rows with a `NULL`/legacy-format `created_at` won't appear
  on the graph for a client that synced them before this change, until that
  client does a full resync. Not worth a backfill migration for phase 1 —
  flagging here per CLAUDE.md's "if a number goes into the scoring engine it
  should be traceable" principle, even though this doesn't touch scoring
  itself, just the graph's ability to place old events in time.
