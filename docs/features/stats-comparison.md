# Stats: solo/comparison stat bars (phase 3)

**Branch:** `claude/stats-update-issue-8n9nh4`
**Status:** Implemented
**Issue:** [#75 — Stats update](https://github.com/chezer1234/Traveleria/issues/75)

---

## 1. What It Is

A third section on the Stats page (below the points-over-time graph from
phase 1 and the continent map from phase 2): your own stats, viewable solo,
with a dropdown to pick another traveller and reveal a side-by-side
comparison — blue-vs-red horizontal bars, the same "tug of war" bar
Territory/GroupBattle/StateBattle already use for battles.

Eight stats, per issue #75: nations visited, sub-regions explored,
sub-region bonus points, cities been to, trophies unlocked, experiences
done, explorer points claimed, and leaderboard position.

## 2. Why

The third bullet of issue #75: "a comparison... in a blue vs red horizontal
bar chart like for the battle system already implemented," viewable on your
own ("solo") as well as against another user.

## 3. Design decisions

No open questions needed a Q&A round this time — the eight stats and the
bar style were both explicit in the issue text, and the remaining choices
were small enough to make directly and document here rather than interrupt
with a question:

- **Where it lives:** a third section on the same `/stats` page, not a new
  route — consistent with phases 1 and 2, and the issue frames all three as
  one "detailed stats page."
- **Picking an opponent:** a plain `<select>` of every other user
  (`getAllUsersPublicLocal`), not a search box. This is a small, family-scale
  app (see CLAUDE.md) — a dropdown is simpler and just as usable as an
  autocomplete would be at this user count, and it mirrors the existing
  home-country `<select>` pattern from SignUp.
- **Leaderboard position is not a proportional bar.** Every other stat is
  "bigger is better," so a bar split proportional to the two values reads
  naturally. Rank is "*smaller* is better" — a proportional bar would
  visually reward the worse (higher) number. Shown instead as plain `#N`
  text for each side with a trophy on whoever's ahead, no bar. Rank comes
  from a full, untruncated ranking (`getLeaderboardLocal` truncates to the
  top 50 + the signed-in user, which isn't enough to rank an arbitrary
  opponent) — reuses the same `computeAllUserTravelResults` helper that
  function already calls.

## 4. How It Works

### Data: `getUserComparisonStatsLocal` (`client/src/lib/queries.js`)

Doesn't re-derive anything — pulls all eight numbers from the same helpers
Trophies/Dashboard/Leaderboard already use:

- `countriesVisited`, `subregionsExplored`, `citiesVisited`,
  `experiencesDone` — from `getTrophyStatusLocal` (already gathers
  `visited`, `subregions`, `citiesVisited`, `experiencesCompleted` for the
  trophy evaluator).
- `trophiesUnlocked` (of `trophiesTotal`) — `evaluateCabinet(trophyStats)`,
  same call `Trophies.jsx` makes, counting `earned: true` entries.
- `subregionPoints` — `score.subregionBonusPoints` from `getUserScoreLocal`
  (the same global UN-subregion bonus phase 2's continent map attributes
  by continent — see `docs/features/stats-continent-map.md` §4 — here shown
  as its own raw total instead).
- `explorerPointsClaimed` — sum of `explorationPoints + cityPoints` across
  `score.countries` (phase 2's "Experience" bucket, minus the subregion
  bonus component, minus Tier 0's internal subregion bonus — the part of
  Experience that's specifically province/city/landmark exploration).
- `leaderboardRank` (of `totalUsers`) — every user's total points via
  `computeAllUserTravelResults`, sorted, ranked, looked up by user id.
  `null` if the user somehow isn't in the ranking (defensive — shouldn't
  happen for a real signed-up user).

Called once for the signed-in user (always, for the solo view) and once
more, on demand, for whichever opponent is picked from the dropdown.

### Pure helpers: `client/src/lib/statsCompare.js`

- `barSplit(valueA, valueB)` — the proportional split for one bar. Both-zero
  is a neutral 50/50 (same divide-by-zero precedent as `territory.js`'s
  `percentA`), not a crash or an arbitrary 0/100.
- `COMPARISON_STATS` — the eight stats in display order, each with its
  `label` and the object key `getUserComparisonStatsLocal` returns, plus a
  `rankStat` flag on leaderboard position (see §3).

### UI: `client/src/components/ComparisonStats.jsx`

Self-contained, same pattern as `GlobalLeaderboardStats.jsx` — takes `db`
(+ `userId`/`homeCountry`) as props and does its own data fetching rather
than threading state through `Stats.jsx`. Solo view is a 2x4 stat-tile grid
(matches the tile pattern already used on `Map.jsx`'s "My Map" stats bar);
comparison view swaps to one bar per stat, `bg-compass`/`bg-sienna` for the
two sides — the exact classes `Territory.jsx`'s tug-of-war bar uses, which
alias the same `--color-you`/`--color-them` tokens in every theme (verified
in `client/src/index.css` — the hex values match across all four themes).

## 5. Browser Testing

Same setup as phases 1 and 2 (Playwright against Chromium; server on local
file-based SQLite, client via Vite; no Chrome tab tooling in this remote
environment).

| # | Test | Result |
|---|------|--------|
| 1 | Sign up two users (A: 5 countries across continents, B: 2 countries), visit `/stats` as A | PASS — solo tile grid shows A's own 8 stats correctly (5 nations, 4 sub-regions, 9 trophies, etc.) |
| 2 | Opponent dropdown lists every other account (including test users from earlier phase runs, since the local dev DB persists across script runs) | PASS |
| 3 | Select B from the dropdown | PASS — flips to "You vs cmpB_..." with 8 blue-vs-red bars, each showing both raw numbers and a proportional split (5 vs 2 nations → ~71%/29% bar; 0 vs 0 → neutral 50/50) |
| 4 | Leaderboard position row | PASS — "#4 of 11" (A, with a trophy — more countries → more points → better rank) vs "#5" (B), rendered as plain ranks with no bar, per the design decision in §3 |
| 5 | Unit tests (`statsCompare.test.js`, 6 cases: proportional split, both-zero neutral 50/50, one-sided 100/0, exact tie, stat list shape, exactly one `rankStat`) | PASS |
| 6 | Full client suite (158 tests) + full server suite (140 tests, unchanged by this phase) | PASS |
| 7 | Lint (scoped to changed files) + production build | PASS |

## 6. Open Questions / Follow-ups

None outstanding. This closes out all three phases of issue #75:

- Phase 1 — points-over-time graph (`docs/features/stats-points-history.md`)
- Phase 2 — continent map, pie overlay + choropleth (`docs/features/stats-continent-map.md`)
- Phase 3 — solo/comparison stat bars (this doc)
