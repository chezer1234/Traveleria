# Trophies 1.6 — the full cabinet

**Status:** Complete (implemented on `claude/trophy-graphics-design-cnhhii`)
**Issue:** [#52 — More trophies 1.6](https://github.com/chezer1234/Traveleria/issues/52)
**Predecessor:** the ten-trophy cabinet from the Atlas visual refresh
([visual-refresh-atlas.md](visual-refresh-atlas.md), PR #50)

## What

Grow the Trophy Cabinet from 10 trophies to a full five-tier honours system —
**bronze → silver → gold → diamond → platinum**, in increasing difficulty —
with original, hand-drawn trophy artwork for every category. Target from the
issue: 25+ trophies. This design ships **46**.

Three kinds of trophy:

1. **Ladders** — seven categories, five tiers each (35 trophies). Each
   category has its own trophy silhouette; the tier sets the metal.
2. **Continental conquests** — complete a continent by visiting every country
   in it. One per continent, all platinum (6 trophies).
3. **Special honours** — one-off achievements with unique artwork (5 trophies).

## The ladders

All counts are live app data: 196 countries, 22 UN sub-regions, 6 continents
(lib/continents.js), ~900 cities, ~366 Tier-0 experiences, 41 island nations
(curated list in lib/trophies.js).

| Category | Bronze | Silver | Gold | Diamond | Platinum |
|---|---|---|---|---|---|
| **Travel Points** (issue-specified) | 100 | 500 | 1,000 | 2,000 | 3,000 |
| **Countries** | 5 | 15 | 30 | 60 | 100 |
| **Continents** | 2 | 3 | 4 | 5 | 6 (all) |
| **Sub-regions** | 3 | 6 | 10 | 15 | 20 |
| **Cities** | 5 | 15 | 30 | 60 | 100 |
| **Island nations** | 1 | 3 | 5 | 10 | 15 |
| **Experiences** | 1 | 5 | 15 | 30 | 60 |

Reasoning on the shape of the curves:

- Points targets are straight from the issue.
- Countries/cities double per tier after silver — platinum (100 countries) is
  a genuine lifetime achievement without requiring all 196.
- Continents top out at all 6; there's no way to make "all continents"
  anything but platinum.
- Sub-regions platinum is 20 of 22 — the last two are always somebody's
  awkward corner (Micronesia + Middle Africa, usually). Fun but fair.
- Islands platinum (15 of 41) rewards a genuinely nautical travel style.
- Experiences only exist in Tier-0 countries, so the ladder starts at 1
  (first experience is a milestone) and climbs to 60.

## Continental conquests (platinum specials)

Visit **every country** in a continent → one platinum trophy per continent,
named for the continent (e.g. *Conqueror of Europe*). Continent membership
uses the same `SUBREGION_TO_CONTINENT` mapping as the group battle chart —
one source of truth, no new geography invented. The card shows live progress
(`41 of 44`) and names a missing country while locked.

## Special honours

| Trophy | Tier | Requirement |
|---|---|---|
| First Stamp *(legacy)* | bronze | Log your first country |
| The 10,000 km Club *(legacy)* | gold | Visit a country ≥ 10,000 km from home |
| Hard Mode *(legacy)* | gold | Visit an "Extremely hard to visit" country (points-engine definition) |
| Century Nation | diamond | Earn over 100 points from a single nation |
| Off the Map | diamond | Visit a nation fewer than 5% of accounts have visited |

Legacy trophies that became ladder rungs keep their exact ids so nothing a
user has earned disappears: *Island Hopper* is the islands bronze,
*The 500 Club* is the points silver, *Regional Scout/Ranger/Legend* are the
sub-region bronze/silver/gold. First Stamp moves from gold to bronze — in a
five-tier world the medal now encodes difficulty, and it's the trophy every
account earns first.

### "Off the Map" — the 5% rule

The local DB syncs every account's `user_countries` rows (that's how the
leaderboard computes offline), so rarity is computed client-side:
`visitors(country) / total accounts < 5%`. Small-userbase guard: while the
app has fewer than 21 accounts nothing can mathematically be under 5%, so the
trophy also unlocks if you are the **sole visitor** of a country among all
accounts. The card explains whichever rule fired.

## Original artwork

Every category gets its own hand-drawn SVG silhouette in the Atlas engraved
style (Fraunces engraving, hairline rules, plate framing):

| Category | Silhouette |
|---|---|
| Travel Points | Loving cup — twin handles, engraved band |
| Countries | Globe on a plinth, meridians engraved |
| Continents | Mountain range with a rising sun |
| Sub-regions | Compass rose medallion |
| Cities | Obelisk with a skyline plinth |
| Island nations | Palm over waves, in a porthole ring |
| Experiences | Torch with a flame |
| Continental conquests | Laurel wreath crowning the continent's initial |
| Specials | Unique art per trophy (stamp, paper plane, mountain, "C" seal, dotted-trail X) |

Five metal finishes, all SVG gradients (no raster assets):

- **Bronze** — warm copper, dark tarnish edge
- **Silver** — cool steel
- **Gold** — the existing `--color-gold` family, gilded
- **Diamond** — ice-blue faceted; a gem-cut sparkle sits in the crest
- **Platinum** — pale iridescent white-metal with a violet-tinged sheen and
  star glints

Locked trophies stay **blind-embossed parchment** (existing convention:
present, waiting, never hidden) with the thin ink progress bar.

The full art set is browsable at
[docs/designs/trophies-1-6.html](../designs/trophies-1-6.html) — every
silhouette × every finish, plus locked states, in one plate. The React
component `client/src/components/TrophyMedal.jsx` renders the same geometry.

## Cabinet layout (Trophies.jsx)

Three sections under the existing cartouche header:

1. **Expedition ladders** — one row per category: the five tier medals side
   by side (earned lit, locked embossed), the next unearned tier carrying the
   ink progress bar and "N to go".
2. **Continental conquests** — six laurel plates with per-continent progress.
3. **Special honours** — the one-offs, card style unchanged from 1.5.

Header count becomes `earned of 46 on display`.

## Data plumbing

`getTrophyStatusLocal` (lib/queries.js) grows four fields, all from the
synced local DB — no network, no new tables, no migrations:

- `citiesVisited` — `COUNT(*)` of the user's `user_cities`
- `countryPoints` — per-nation totals, already computed inside
  `getUserScoreLocal` (`score.countries`), now passed through
- `totalAccounts` — `COUNT(*)` of `users_public`
- `visitorsByCountry` — `user_countries` grouped by country, distinct users

`evaluateTrophies(stats)` keeps its pure shape: definitions + evaluator, no
db access, fully unit-testable (`lib/__tests__/trophies.test.js`).

## Open questions (settled)

- **Do we retire the old 10?** No — every 1.5 trophy survives, either as a
  ladder rung with the same id or as a special. Nobody logs in to find an
  earned trophy gone.
- **Platinum = all countries in a continent, even microstates?** Yes — the
  issue is explicit that continent completion is platinum-only and total.
  That's what makes it platinum.
- **Sub-region tier retune** — silver moves 5 → 6 to fit the five-tier curve.
  Charlie owns these tunables (`LADDERS` table at the top of trophies.js).
