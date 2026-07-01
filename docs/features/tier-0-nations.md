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
- Every state gets **at least 4 loggable cities** (major cities, already loggable today, worth 0.5 pts; new "additional" cities worth 0.25 pts) — except Wyoming and Rhode Island, which are exempt from the 4-city minimum.
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

**What changes:** instead of being awarded in full the moment a province is marked "visited," `x` is now unlocked gradually by logging that state's experiences.

### Experiences

- Each state/province has `n` experiences (5–10, real named landmarks — stadiums, skyscrapers, etc.).
- All experiences within one state are worth the same value:
  ```
  experience_value = x / n
  ```
- Logging an experience awards `experience_value`. Logging all `n` experiences awards exactly `x` — no more, no less.

### Cities (bonus, on top of x)

- Major cities (already loggable today) = **0.5 pts** each.
- New "additional" cities (added so every state has ≥4 total, except WY/RI) = **0.25 pts** each.
- City points are **additive on top of x**, not part of it — a state's true ceiling is `x + city_max`, where `city_max` is the sum of all its city values.

### % Explored

```
total_available = x + city_max
total_earned    = experience_points_logged + city_points_logged
percent_explored = total_earned / total_available
```

This is what's shown on hover over a state/province.

### Sub-region bonus

Visiting every state/province in a sub-region (see below) earns a bonus:

```
subregion_bonus = 0.5 × Σ(x_state) for all states in the region
```

*(Open question — see below on what triggers this and what exactly gets summed.)*

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

**Phase 1 — Scoring core**
- `province_code`/`city_type` on `cities`, `subregion` on `provinces`
- `province_experiences` + `user_province_experiences` tables
- Gradual-unlock scoring + % explored formula in `points.js`
- Pilot data: California, Texas, Wyoming, Rhode Island, Beijing, Hong Kong (experiences + expanded cities)
- Tier 0 badge/flag banner on country page, hover % explored on existing province map
- Tests for the new formula (unit) + pilot data

**Phase 2 — Time & Battles**
- Per-province time logging
- State/province-level battle (reuse Territory/GroupBattle patterns, scoped to one country)

**Phase 3 — Full rollout & polish**
- Remaining 45 US states / 31 China provinces of experiences + additional cities
- China provincial flag assets
- Sub-region UI, Hong Kong/Macau special-casing in UI

---

## Open Questions

1. **Sub-region bonus trigger** — does "visit every state in the region" mean logging *at least one* experience/city per state (binary visit, like today), or does it require each state to reach 100% explored first? The issue text reads like the former; confirm before implementing.
2. **Sub-region bonus base** — "half the sum of all states in that region" — sum of just `x` (experience pool) per state, or `x + city_max` (full total)?
3. **Experience sourcing** — pilot states first (per team decision), but who verifies factual accuracy of each landmark before it's seeded? Needs the same rigor as `01_countries.js` sourcing.
4. **WY/RI city minimum** — how many cities do they get instead of 4? Whatever they currently have plus maybe 1-2 more, given both currently have zero major cities in the seed today.
5. **Provincial flag assets** — where do the actual SVGs/images live, what license, and does the China "National Games" flag concept have accessible reference art, or do we need to design placeholders?
6. **Battle scope** — is a state-level battle only meaningful between two users who've both traveled the same country, or should it be viewable/comparable more generally?
