# Visual Refresh — the Atlas system (+ Trophy Cabinet)

**Status:** In progress
**Decided:** 6 July 2026, by Charlie on PR #49 (design concepts)
**Design record:** [docs/designs/index.html](../designs/index.html) → [docs/designs/direction-final.html](../designs/direction-final.html)

## What

Reskin TravelPoints in the **Atlas** design system chosen from the three concepts —
an heirloom expedition atlas: warm paper surfaces, Fraunces display serifs, maps
framed as plates, the score breakdown as a printed ledger — combined with
**Jetstream's trophy cabinet** (a new `/trophies` page with ten achievements) and
**one chart language** merged from both concepts. Everything must work in portrait
phone view (Charlie's explicit requirement).

Charlie's decision, verbatim:

> Let's implement the Atlas system, however with the jetstream trophie cabinet and
> system, we should have around 10 trophies such as completing at least 5
> experiences, going to 3, 5 and 10 sub continents, and others. Also the charts for
> both atlas and jet stream should be used seemlessly
>
> Make sure the interphase is compatible with portrait phone view also

## How

### Design tokens (Tailwind v4 `@theme`, in `client/src/index.css`)

| Token | Value | Role |
|---|---|---|
| `--color-paper` | `#f6f1e7` | page background |
| `--color-panel` | `#fbf8f1` | card/panel background |
| `--color-ink` | `#26221b` | primary text |
| `--color-ink-soft` | `#6b6355` | secondary text |
| `--color-hairline` | `#d8cfba` | rules, borders |
| `--color-parchment` | `#e4dccb` | unvisited map fill, empty bars |
| `--color-atlas` | `#3e5f45` | visited map fill, progress fills, success |
| `--color-atlas-deep` | `#2f4a36` | hover state of atlas |
| `--color-compass` | `#2e5fa3` | links, primary buttons, "You" in battles |
| `--color-compass-deep` | `#244b82` | hover state of compass |
| `--color-sienna` | `#b4552d` | opponent in battles |
| `--color-plum` | `#7b4a8f` | contested in battles |
| `--color-gold` | `#c9a227` | decoration, Tier 0 accents, earned trophies — **never encodes data** |
| `--font-display` | Fraunces, Georgia, serif | headings, hero numerals |
| `--font-sans` | Inter, system stack | body, UI |

The battle triple (compass / sienna / plum on paper) was CVD-validated during the
concept phase; the old blue/red/purple also passed, but the Atlas triple keeps the
whole app in one palette.

Shared component classes (also `index.css`): `.plate` (panel with the double-rule
atlas border), `.smallcaps` (letterspaced uppercase microlabel), `.stamp` (rotated
inked stamp), `.loading-spinner` (recolored).

### One chart language (from the direction doc)

- Stat tiles: ledger style — smallcaps label, Fraunces numeral, hairline rules;
  thin progress bar (≤ 8px, rounded ends) with milestone ticks where a target exists.
- Exploration bars: atlas-green fill on parchment, "N% explored" pill riding the end.
- Tug-of-war: engraved rope bar, big Fraunces numerals at each end, center hairline.
- Values always printed in ink (never only in a series colour); every multi-colour
  map keeps a visible legend; `tabular-nums` on all scores.

### Map fills

| State | Fill | Hover |
|---|---|---|
| Visited | `#3e5f45` | `#2f4a36` |
| Not visited | `#e4dccb` | `#d3c7ad` |
| Explore mode | `#b8c8e2` | `#9db4d8` |
| Battle: you / them / contested / none | `#2e5fa3` / `#b4552d` / `#7b4a8f` / `#e4dccb` | darker steps |

Stroke between countries: paper (`#f6f1e7`).

### Trophy Cabinet (`/trophies`)

New page + `client/src/lib/trophies.js` (pure definitions + evaluator) +
`getTrophyStatusLocal` in `queries.js` (data gathering, follows the existing
local-query pattern). Ten trophies; thresholds live in `trophies.js` as plain
constants so Charlie can tune them:

| Trophy | Requirement | Medal |
|---|---|---|
| First Stamp | log your first country | gold |
| Island Hopper | visit your first island nation | gold |
| Continental | set foot on 5 continents | gold |
| Regional Scout | visit 3 sub-regions | bronze |
| Regional Ranger | visit 5 sub-regions | silver |
| Regional Legend | visit 10 sub-regions | gold |
| Experience Collector | complete 5 experiences | gold |
| The 10,000 km Club | visit a country ≥ 10,000 km from home | gold |
| Hard Mode | visit an "Extremely hard to visit" country | gold |
| The 500 Club | pass 500 total Travel Points | gold |

Earned trophies render as gilded medallions with the qualifying detail engraved
(e.g. "New Zealand · 18,814 km"); locked ones as blind-embossed outlines with a
thin ink progress bar. "Sub-regions" means distinct UN M49 sub-regions among
visited countries — the same definition as the Map page stat. "Island nation" is a
curated code list in `trophies.js`. Difficulty reuses the tourism-ratio labels
from the points engine.

### Portrait phone

Per the direction doc: single column below `sm`; stat tiles 2-up; map plates keep
aspect ratio full-bleed with the legend below; ledger rows wrap question-above-answer;
trophy grid 2-up; ≥ 44px touch targets on checkboxes and toggles. The existing
hamburger nav stays (gains a Trophies link).

### Rollout (this PR)

1. Tokens + fonts + `Layout` (nav/footer) — the paper base every page sits on.
2. Full Atlas treatment: `Map.jsx`, `CountryDetail.jsx` + `ScoreBreakdown.jsx`,
   `Territory.jsx` / `StateBattle.jsx` / `GroupBattle.jsx`, new `Trophies.jsx`.
3. Consistency pass on the rest (Dashboard, Leaderboard, AddCountries, Subregions,
   Groups, SignIn/SignUp, ChecklistOverlay): indigo → compass, gray → paper/ink,
   ledger stat tiles. No structural changes.

No backend or schema changes; trophies compute client-side from existing tables.

## Open questions

- **Trophy thresholds** are the design-doc examples — Charlie tunes numbers/names
  after seeing them live (constants at the top of `trophies.js`).
- **Trophy earn dates:** derived from the qualifying visit's `visited_at` where the
  data supports it; not stored. If we later want "earned on" to be permanent
  history, that needs a table.
- **More trophies** (streaks, microstates, "all of Europe") — deliberately left for
  a follow-up once the cabinet exists.
