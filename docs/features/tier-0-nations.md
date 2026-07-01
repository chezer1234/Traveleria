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

**Phase 1b — Local-first client mirror (not started — important finding)**
This app is local-first: `client/src/pages/CountryDetail.jsx` reads exclusively from a
browser-side SQLite mirror (`client/src/db/worker.js`) and computes scores via a
**full duplicate** of the scoring engine (`client/src/lib/points.js`), independent
of the Express API. The server-side Phase 1a work above is inert for the actual
UI until it's mirrored client-side:
- `client/src/db/worker.js`: add `province_code`/`city_type` to `cities`, `subregion`
  to `provinces`, new `province_experiences`/`user_province_experiences` tables,
  and a schema-version bump (the worker wipes + resnapshots on mismatch).
- `client/src/lib/points.js`: port `TIER_0_CODES` + the same Tier 0 functions.
- `client/src/lib/queries.js` / `mutations.js`: new experience query/mutation helpers.
- `ProvinceMap.jsx` hover tooltip + `CountryDetail.jsx` badge + experience-logging UI.

**Important:** flipping `getCountryTier` to return 0 for US/CN client-side
*before* the local schema/experience data exists would regress real scores —
existing visited provinces would drop from `x` to `0.9x` with no way to earn
the missing 0.5x experience pool. Do not ship the tier bump without the full
local mirror landing in the same change.

**Phase 2 — Time & Battles**
- Per-province time logging
- State/province-level battle (reuse Territory/GroupBattle patterns, scoped to one country)

**Phase 3 — Full rollout & polish**
- Remaining 45 US states / 31 China provinces of experiences + additional cities
- China provincial flag assets
- Sub-region UI, Hong Kong/Macau special-casing in UI

---

## Resolved (round 2)

- **Sub-region bonus trigger:** visiting every state in the region (binary — same `visited_at` check as today), not full exploration.
- **Sub-region bonus base:** `0.5 × Σ(x_state)` — sum of base `x` values only, not the 1.4x-scaled total and not city points.
- **Visit baseline / experience split:** 0.9x for visiting, 0.5x pool for experiences (1.4x combined), cities on top. See Scoring Mechanic above.
- **City minimum:** flat 4 cities for every state, no exceptions for Wyoming/Rhode Island.
- **Flag assets:** believed to already exist and be usable — US state flags (standard government works) and China's National Games delegation flags. Still needs sourcing/licensing verification in Phase 3, but no new design work expected.
- **Retroactive credit:** automatic. Existing `visited_at` rows for US/China provinces are untouched; the same data just now computes to 0.9x instead of the old full x, with the 0.5x experience pool and cities still open to unlock. No migration needed beyond the formula change itself.
- **Visit trigger:** logging a state's first experience or city automatically marks it visited too (auto-sets `visited_at`), so the 0.9x baseline is never missed just because a user went straight to logging specifics without a separate "I've been here" tap.

## Open Questions

1. **Experience sourcing method** — use real visitor/attendance numbers where publicly available (e.g. national park visitor stats, stadium attendance, state tourism board figures) to choose which 5-10 landmarks per state are "the" experiences, similar rigor to how `01_countries.js` sources population/tourism data. Where no visitor-count data exists for a landmark, fall back to documented notability (e.g. National Register of Historic Places, state tourism board's own "top attractions" list) rather than subjective picks.
2. **Battle scope** — is a state-level battle only meaningful between two users who've both traveled the same country, or should it be viewable/comparable more generally?
