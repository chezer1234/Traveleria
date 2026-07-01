# Tier 0 Nations (US & China)

**Status:** Planning
**Branch:** `claude/tier-0-nations-issue-46-42bu31`
**Issue:** [#46](https://github.com/chezer1234/Traveleria/issues/46)

---

## What It Does

US and China get a distinct **Tier 0** — a scoring tier above Tier 1, exclusive to these two countries, that turns province/state exploration from a single binary checkbox into a much deeper system:

- A flag banner at the top of the country page marks it as Tier 0.
- Each state/province shows a **% explored** on hover, plus a state flag (provincial flags for China, based on Chinese National Games delegation flags).
- States/provinces are grouped into **sub-regions** (Census regions for the US, economic zones for China). Visiting every state in a sub-region earns a bonus.
- Each state/province gets **5–10 loggable experiences** (stadiums, skyscrapers, etc.), all worth equal points within that state.
- Every state gets **at least 4 loggable cities**, no exceptions (major cities, already loggable today, worth 0.5 pts; new "additional" cities worth 0.25 pts).
- Time can be logged per state/province, and a **battle** feature (reusing the existing territory-battle UI) lets two users compare which states/provinces they control.
- Hong Kong and Macau are added as provinces with no cities, but experiences are still loggable.

This does **not** change scoring for any other Tier 1/2 country (India, Russia, Peru, etc.) — their province visits stay the simple binary "visited = full points" model.

---

## Why

US and China are both Tier 1 today (top-10 population), which already unlocks province-level exploration points. But at 51 and 33 subdivisions respectively, with huge internal diversity, a binary "visited = done" checkbox undersells how much there is to actually explore. Charlie's read: someone who's done 3 experiences and 1 city in Texas has explored less than someone who's done all 10 — the current model can't tell the difference. Tier 0 exists to reward that granularity for the two countries big enough to deserve it.

---

## Scoring Mechanic

### Base value (unchanged input)

Every Tier 0 state/province still has a base explorer value **x**, computed exactly like Tier 1 today:

```
x = (province_population / national_population) × explorer_ceiling
```

(`explorer_ceiling` per country, from the existing formula in `points.js`.)

**What changes:** `x` is no longer the whole story. A state now has three independently-earned components:

### 1. Visit baseline — 90% of x

Simply marking the state/province as visited (the same `user_provinces.visited_at` action that exists today for every Tier 1/2 country) awards **0.9x** immediately — no experiences or cities required. This preserves the "you got on a plane and explored somewhere new, it counts" principle: showing up is still worth almost the full old value.

### 2. Experiences — 50% of x, split evenly

- Each state/province has `n` experiences (5–10, real named landmarks — stadiums, skyscrapers, etc.).
- The experience pool is **0.5x total**, split evenly:
  ```
  experience_value = (0.5 × x) / n
  ```
- Logging an experience awards `experience_value`. Logging all `n` awards the full `0.5x`.

Note the baseline (0.9x) and the experience pool (0.5x) together total **1.4x** — visiting *and* fully exploring is worth 40% more than a Tier 1 province visit today.

### 3. Cities — bonus, on top of 1.4x

- Major cities (already loggable today) = **0.5 pts** each (unchanged, flat, matches the existing global city-bonus system).
- New "additional" cities (added so every state has ≥4 loggable cities total — no exceptions) = **0.25 pts** each.
- City points are **additive on top of 1.4x** — a state's true ceiling is `1.4x + city_max`, where `city_max` is the sum of all its city values. This is the "just over 1.4×" total value increase Charlie described — cities push it a bit further.

### % Explored

```
total_available = 1.4 × x + city_max
total_earned    = (visited ? 0.9x : 0) + experience_points_logged + city_points_logged
percent_explored = total_earned / total_available
```

This is what's shown on hover over a state/province.

### Sub-region bonus

Visiting every state/province in a sub-region (see below) earns a bonus — **visiting**, not fully exploring, is the trigger:

```
subregion_bonus = 0.5 × Σ(x_state) for all states in the region
```

Sum is over each state's base `x` value (not the 1.4x-scaled total, not city points) — confirmed by Charlie.

---

## Sub-Regions

Real, sourced groupings — not invented boundaries:

**US — Census Bureau's 4 regions:**

| Region | States |
|---|---|
| Northeast | CT, ME, MA, NH, RI, VT, NJ, NY, PA |
| Midwest | IL, IN, MI, OH, WI, IA, KS, MN, MO, NE, ND, SD |
| South | DE, FL, GA, MD, NC, SC, VA, DC, WV, AL, KY, MS, TN, AR, LA, OK, TX |
| West | AZ, CO, ID, MT, NV, NM, UT, WY, AK, CA, HI, OR, WA |

**China — official economic zones (4 groups):**

| Zone | Provinces (examples) |
|---|---|
| Eastern | Beijing, Tianjin, Hebei, Shanghai, Jiangsu, Zhejiang, Fujian, Shandong, Guangdong, Hainan |
| Central | Shanxi, Anhui, Jiangxi, Henan, Hubei, Hunan |
| Western | Chongqing, Sichuan, Guizhou, Yunnan, Tibet, Shaanxi, Gansu, Qinghai, Ningxia, Xinjiang, Guangxi, Inner Mongolia |
| Northeastern | Liaoning, Jilin, Heilongjiang |

Hong Kong and Macau are excluded from the sub-region groupings (no cities either — experiences only).

---

## Data Model Changes

### `cities` table
Add `province_code` (nullable FK → `provinces.code`) and `city_type` (`'major'` / `'additional'`). Existing rows backfilled as `'major'` and mapped to their province. This closes the gap flagged as future work in `docs/features/province-exploration.md` §11.

### `province_experiences` (new)
```sql
id            TEXT PRIMARY KEY
province_code TEXT FK → provinces.code, CASCADE
name          VARCHAR(150) NOT NULL
description   TEXT
```

### `user_province_experiences` (new)
```sql
id            TEXT PRIMARY KEY
user_id       TEXT FK → users.id, CASCADE
experience_id TEXT FK → province_experiences.id, CASCADE
visited_at    DATE NULL
UNIQUE(user_id, experience_id)
```

### `provinces` table
Add `subregion` (string, e.g. `"West"` / `"Eastern"`) — populated only for US/CN rows.

### Province time logging
Add `days` to `user_provinces` (mirroring `user_country_visits`), or a new `user_province_visits` table if we want multiple dated entries per province like countries support.

### Provincial flags
No image-asset pipeline exists today (country flags are emoji, generated from ISO codes). Provinces have no ISO alpha-2 equivalent, so this needs actual SVG/image assets per state/province — a new asset pipeline, not a formula. China's should be based on National Games delegation flags/emblems.

---

## Phased Build Plan

Per team's own workflow (one feature, tested in phases, single PR at the end):

**Phase 1a — Server scoring core (done)**
- `province_code`/`city_type` on `cities`, `subregion` on `provinces` — migrations `20260701001`/`20260701002`
- `province_experiences` + `user_province_experiences` tables
- Gradual-unlock scoring + % explored formula in `server/src/lib/points.js` (`calculateTier0ProvinceExploration`, `calculateTier0SubregionBonus`)
- Pilot data: California, Texas, Wyoming, Rhode Island, Beijing, Hong Kong (experiences + expanded cities)
- `server/src/routes/countries.js` + `users.js`: Tier 0 detail response, experience logging endpoints
- 57 new/updated unit tests in `points.test.js`, all passing (117/117 server suite)

**Phase 1b — Local-first client mirror (done)**
This app is local-first: `client/src/pages/CountryDetail.jsx` reads exclusively from a
browser-side SQLite mirror (`client/src/db/worker.js`) and computes scores via a
**full duplicate** of the scoring engine (`client/src/lib/points.js`), independent
of the Express API. Phase 1a alone was inert for the actual UI — this phase mirrors
it into the local-first stack:
- `client/src/db/worker.js`: `province_code`/`city_type` on `cities`, `subregion` on
  `provinces`, new `province_experiences` (snapshot-only reference data) and
  `user_province_experiences` (synced via the `_changes` feed) tables. No schema-version
  bump needed — new columns/tables are additive and `ensureSchema()`'s idempotent
  `ALTER TABLE` pattern (already used for `countries.subregion`) covers existing local DBs.
- `client/src/lib/points.js`: same `TIER_0_CODES` + `calculateTier0ProvinceExploration` +
  `calculateTier0SubregionBonus` port as the server, byte-for-byte identical logic.
- `client/src/lib/queries.js`: `getUserCountryScoreLocal` (real per-province
  earned/percentExplored via `calculateCountryPoints`), experience loaders, Tier 0
  branches in `getCountryLocal`/`getUserStatusForCountry`/`getLeaderboardLocal`.
- `client/src/lib/mutations.js`: `addProvinceExperienceOptimistic` /
  `removeProvinceExperienceOptimistic` — auto-marks the province visited on first
  experience log, with a `province_visit_id` echoed to the server so the optimistic
  local row and the server-created row share a PK (same invariant as every other
  Phase 5 mutation — the alternative risked duplicate `user_provinces` rows).
- `CountryDetail.jsx`: flag banner + amber Tier 0 badge, sub-region bonus chips,
  experience-logging checklist grouped by state, city list distinguishing
  major (0.5 pts) vs additional (0.25 pts).
- `ProvinceMap.jsx` hover tooltip now shows real `percentExplored`.
- 6 new/updated unit tests in `client/src/lib/__tests__/points.test.js` (mirrors
  the server suite), 63/63 client tests passing.

Verified end-to-end in a real browser (Playwright): signed up, added the US,
visited California (90% baseline: 15.3/25.8 = 59.3% explored), logged one
experience (63.4% explored, exactly `(15.3 + x*0.5/8) / 25.8`), confirmed the
map hover tooltip and sub-region bonus chips render the same numbers as the list.

**Phase 2 — Time & Battles**
- Per-province time logging
- State/province-level battle (reuse Territory/GroupBattle patterns, scoped to one country)

**Phase 2 — Time & Battles (done)**
- `user_province_visits` table (migration `20260702001`) — mirrors `user_country_visits`
  exactly, scoped to a province: `days` + optional `visited_at`, add-the-province-first rule.
- Server routes `POST`/`DELETE /:id/province-visits`, snapshot payload, worker.js
  DDL/TABLE_MAP/TABLE_COLUMNS/hydrate, `queries.js`/`mutations.js` helpers — same
  four-layer plumbing as every other user-data table.
- `CountryDetail.jsx`: each Tier 0 state/province row gets a "⏱ Log time" toggle
  that expands an inline mini version of the country-level time-log card
  (list + add form), scoped to that one state.
- `client/src/lib/provinceTerritory.js` (new): `computeProvinceTerritory` —
  a thin adapter over the existing, battle-tested `computeTerritory` (issue #29),
  reusing it byte-for-byte rather than re-deriving the algorithm. Feeds it each
  user's Tier 0 `provinceBreakdown` (visited + earnedPoints) instead of country
  totals, and days from `user_province_visits`.
- `StateBattle.jsx` (new page, `/state-battle/:userId/:countryCode`) — same
  tug-of-war bar / time-and-points tabs / contested list as the country-level
  Territory page, with `ProvinceMap` extended (`getFill`/`getTooltip`/`legend`
  props) to render read-only two-colour ownership instead of visited/not-visited.
- Battle entry point: a "⚔ Battle" button on the Tier 0 country page (only
  shown once the country is visited) opens a picker restricted to other users
  who've also visited that country (`getUsersWhoVisitedCountryLocal`) — no
  battle is offered against someone who hasn't been there, per the resolved
  scope decision.
- 7 new unit tests for `computeProvinceTerritory`, all passing.

Verified end-to-end with two isolated browser sessions (Playwright, separate
local DBs): user A visited California + Texas and logged 5 days in California;
user B visited only California. Time-mode battle correctly gave A both states
(2-0); switching to points-mode correctly made California contested (both
earn the same population-ratio baseline unless one of them logs experiences)
while Texas stayed A's. The ownership map's election-style gradient opacity
(California "medium" margin vs. Texas "full" margin) came for free from reusing
`computeTerritory` unmodified.

**Phase 3 — Full rollout (data) — done; flags/polish still open**
- All 47 remaining US states + all 31 remaining China provinces/regions
  (including Macau) now have experiences and enough cities to hit the
  4-city minimum, using the same sourcing rigor as the pilot (real, famous,
  verifiable landmarks; real city names).
- `server/src/db/seeds/03_cities.cjs` and `04_province_experiences.cjs` are
  the single source of truth (each now exports its array); the backfill
  migration `20260703001_add_tier0_phase3_rollout.cjs` reads from those
  exports and inserts whatever's missing, instead of duplicating ~600 rows
  a second time inline (the Phase 1 pilot migration did duplicate its much
  smaller dataset — not worth it at this size). Verified idempotent and
  correct via a direct backfill simulation (deleted a few Phase 3 rows,
  re-ran the migration, confirmed exactly those rows came back and nothing
  duplicated).
- DC/Shanghai/Chongqing/Tianjin (single-city administrative units, like
  Beijing) use real districts/neighbourhoods as their "additional cities"
  rather than inventing separate municipalities.
- **Confidence caveat:** US data (city names + populations, landmarks) is
  high-confidence — well-known cities/sites, standard 2020-census-era
  population figures. China data is real but **lower confidence** —
  landmark lists per province are shorter (3-4 vs 5-8 for US) and city
  population figures are approximate prefecture-level estimates, not
  pulled from a single verified dataset the way `01_countries.js` is.
  **Recommend a spot-check pass on the China population figures before
  treating this as final production data** — flagging per CLAUDE.md's data
  quality principle rather than silently presenting equal confidence.
- Still open: China provincial flag assets (believed available, not yet
  sourced/integrated), sub-region UI polish, Hong Kong/Macau special-casing
  in the UI (they already work data-wise — no cities, experiences only —
  but haven't had a UI pass to call out that they're intentionally
  city-less rather than incomplete).

---

## Resolved (round 2)

- **Sub-region bonus trigger:** visiting every state in the region (binary — same `visited_at` check as today), not full exploration.
- **Sub-region bonus base:** `0.5 × Σ(x_state)` — sum of base `x` values only, not the 1.4x-scaled total and not city points.
- **Visit baseline / experience split:** 0.9x for visiting, 0.5x pool for experiences (1.4x combined), cities on top. See Scoring Mechanic above.
- **City minimum:** flat 4 cities for every state, no exceptions for Wyoming/Rhode Island.
- **Flag assets:** believed to already exist and be usable — US state flags (standard government works) and China's National Games delegation flags. Still needs sourcing/licensing verification in Phase 3, but no new design work expected.
- **Retroactive credit:** automatic. Existing `visited_at` rows for US/China provinces are untouched; the same data just now computes to 0.9x instead of the old full x, with the 0.5x experience pool and cities still open to unlock. No migration needed beyond the formula change itself.
- **Visit trigger:** logging a state's first experience or city automatically marks it visited too (auto-sets `visited_at`), so the 0.9x baseline is never missed just because a user went straight to logging specifics without a separate "I've been here" tap.

## Resolved (round 3)

1. **Experience sourcing method (remaining rollout)** — same approach as the pilot: real visitor/attendance numbers where publicly available, documented notability (National Register, state tourism boards) as fallback. Applies to the remaining 45 US states and 27 China provinces/regions in Phase 3.
2. **Battle scope** — state-level battles are only available between two users who have **both visited the country**. No battle entry point for a country either side hasn't added.
3. **Provincial flag assets** — confirmed available (US state flags, China's National Games delegation flags). Sourcing the actual files is a Phase 3 task.
