# Province-Based Exploration System

**Branch:** `feature/province-exploration-system`
**Status:** Planning
**Last Updated:** 2026-04-04

---

## 1. Motivation

The current city-based exploration system has two structural problems:

1. **100% explored is unreachable.** Cities in the DB do not cover the full national population, so exploration % caps around 9–10% regardless of effort.
2. **Exploration points don't reflect country scale.** Exploring the US should be worth significantly more than exploring Vatican City — but the current formula doesn't adequately reward coverage of large, populous nations.

This feature replaces city-based exploration with a province/state-level system for the world's most populous countries, and recalibrates how explorer points are calculated relative to base points.

---

## 2. Country Tiers

Countries are classified into three tiers by population rank. The top 30 by population from our seed data:

| Rank | Country | Code | Population | Tier |
|------|---------|------|-----------|------|
| 1 | China | CN | 1,439,323,776 | 1 |
| 2 | India | IN | 1,380,004,385 | 1 |
| 3 | United States | US | 331,002,651 | 1 |
| 4 | Indonesia | ID | 273,523,615 | 1 |
| 5 | Pakistan | PK | 220,892,340 | 1 |
| 6 | Brazil | BR | 212,559,417 | 1 |
| 7 | Nigeria | NG | 206,139,589 | 1 |
| 8 | Bangladesh | BD | 164,689,383 | 1 |
| 9 | Russia | RU | 145,934,462 | 1 |
| 10 | Mexico | MX | 128,932,753 | 1 |
| 11 | Japan | JP | 126,476,461 | 2 |
| 12 | Ethiopia | ET | 114,963,588 | 2 |
| 13 | Philippines | PH | 109,581,078 | 2 — see anomaly note |
| 14 | Egypt | EG | 102,334,404 | 2 |
| 15 | Vietnam | VN | 97,338,579 | 2 |
| 16 | DR Congo | CD | 89,561,403 | 2 |
| 17 | Turkey | TR | 84,339,067 | 2 — see anomaly note |
| 18 | Iran | IR | 83,992,949 | 2 |
| 19 | Germany | DE | 83,783,942 | 2 |
| 20 | Thailand | TH | 69,799,978 | 2 — see anomaly note |
| 21 | United Kingdom | GB | 67,886,011 | 2 — see anomaly note |
| 22 | France | FR | 67,390,000 | 2 |
| 23 | Italy | IT | 60,461,826 | 2 |
| 24 | Tanzania | TZ | 59,734,218 | 2 |
| 25 | South Africa | ZA | 59,308,690 | 2 |
| 26 | Myanmar | MM | 54,409,800 | 2 — see anomaly note |
| 27 | Kenya | KE | 53,771,296 | 2 |
| 28 | South Korea | KR | 51,269,185 | 2 |
| 29 | Colombia | CO | 50,882,891 | 2 |
| 30 | Spain | ES | 46,754,778 | 2 |

All other countries (~165) are **Tier 3**.

### Tier summary

| Tier | Countries | Exploration system |
|------|-----------|-------------------|
| **Tier 1** | Ranks 1–10 by population | Provinces + optional city bonus |
| **Tier 2** | Ranks 11–30 by population | Provinces only |
| **Tier 3** | All others | Top-15-cities-per-country system |

---

## 3. Points Formula

### 3.1 Base Points

```
base = subregion_multiplier × (population / annual_tourists)
```

`subregion_multiplier` replaces the old `regional_multiplier`. It is calculated from geographic distance between the user's home region and the destination region. Flight prices are **excluded** (too volatile). Anomaly corrections are applied for outlier countries as in the current system.

> The existing `REGION_MULTIPLIERS` table is the starting point. Refinements to those values may be made during implementation once we can test outputs.

### 3.2 Explorer Points Ceiling

```
explorer_ceiling = base × (area_km2 / regional_value)
```

`regional_value` is a **tunable constant per country or region** that prevents extreme results for very large or very dense nations. For example, Russia (17M km²) and China (9.6M km²) need different regional_values to ensure China scores comparably to Russia despite having a smaller area, because China's population density makes its provinces more meaningful to explore.

> Exact `regional_value` constants will be calibrated during implementation using representative test cases. They are not derived algorithmically — they are editorial tuning values.

### 3.3 Province Points (Tiers 1 & 2)

Each province is worth:

```
x = (province_population / national_population) × explorer_ceiling
```

Visiting a province earns `x` explorer points for that province.

### 3.4 City Bonus (Tier 1 only)

For Tier 1 countries, provinces that contain one or more of the country's **top 15 cities by population** have a bonus allocation:

```
city_bonus_ceiling = 0.4 × x
```

Visiting a city within that province earns a share of `city_bonus_ceiling`, proportional to the city's population relative to all top-15 cities present in that province:

```
city_contribution = (city_population / sum_of_top15_cities_in_province) × city_bonus_ceiling
```

Provinces with no top-15 cities have no bonus ceiling. Maximum province total = `x + 0.4x = 1.4x`.

### 3.5 Tier 3 Exploration (City-Based Fallback)

```
exploration_ratio = sum(visited_top15_city_populations) / sum(all_top15_city_populations)
tier3_explorer_points = exploration_ratio × explorer_ceiling
```

The top 15 cities are ranked **per country** by population. This uses existing city data.

### 3.6 Total Country Points

```
total = base + explorer_points_earned
```

Where `explorer_points_earned` is the sum of province visits (+ city bonuses for Tier 1), or the tier-3 city ratio calculation.

---

## 4. Data Migration

| Scope | Action |
|-------|--------|
| Tier 1 country city visits | **Kept** — mapped to city bonus system where city is in top-15 national list |
| Tier 2 country city visits | **Orphaned** — retained in DB but excluded from score calculation |
| Tier 3 country city visits | **Active** — used in top-15 city ratio system |

No city data is deleted. Orphaned rows are simply ignored by the scoring engine.

---

## 5. Province Data — Seeding Plan & Anomalies

Provinces will be seeded manually for the top 30 countries. The `provinces` table will store: `code`, `country_code`, `name`, `population`, `area_km2`.

### Proposed administrative level per country

| Country | Admin level | Count | Notes |
|---------|-------------|-------|-------|
| China | Province/Autonomous Region/Municipality/SAR | 34 | Well-defined. Includes Tibet, Xinjiang, Hong Kong, Macau. |
| India | States + Union Territories | 36 | Standard, well-documented. |
| United States | States + DC | 51 | Clean. |
| Indonesia | Provinces | 34 | Standard. |
| Pakistan | Provinces + territories | ~8 | Complex — includes AJK, GB, FATA. **Decision needed on how to handle disputed territories.** |
| Brazil | States + Federal District | 27 | Standard. |
| Nigeria | States + FCT | 37 | Standard. |
| Bangladesh | Divisions | 8 | Using divisions (not 64 districts). |
| Russia | Federal subjects | 85 | Many, but well-known. Includes republics, oblasts, krais, federal cities. |
| Mexico | States + CDMX | 32 | Standard. |
| Japan | Prefectures | 47 | Standard. |
| Ethiopia | Regions + chartered cities | 12 | Standard. |
| Philippines | **Regions (not provinces)** | 17 | ⚠️ **Anomaly: 82 official provinces — far too granular.** Recommend 17 administrative regions instead. |
| Egypt | Governorates | 27 | Standard. |
| Vietnam | Provinces + municipalities | 63 | High count but manageable. |
| DR Congo | Provinces | 26 | Post-2015 restructuring. |
| Turkey | **Statistical regions (NUTS-1)** | 12 | ⚠️ **Anomaly: 81 administrative provinces — too many.** Recommend 12 NUTS-1 statistical regions for usability. |
| Iran | Provinces | 31 | Standard. |
| Germany | Federal states (Länder) | 16 | Clean. |
| Thailand | **Groups / super-regions** | ~6 | ⚠️ **Anomaly: 77 provinces — too granular.** Recommend grouping into ~6 geographic regions (North, Northeast, Central, East, West, South). |
| United Kingdom | **Nations** | 4 | ⚠️ **Anomaly: sub-national admin is very complex (counties, LAs, unitary authorities vary by nation).** Recommend England, Scotland, Wales, Northern Ireland as the 4 top-level units. |
| France | Regions (metropolitan + overseas) | 18 | Standard. Includes overseas regions (Guadeloupe, Martinique, etc.). |
| Italy | Regions | 20 | Standard. |
| Tanzania | Regions | 31 | Standard. |
| South Africa | Provinces | 9 | Clean. |
| Myanmar | States + Regions + Union Territory | 15 | ⚠️ **Anomaly: overlapping categorisations (7 states, 7 regions, 1 union territory, self-administered zones).** Recommend the 14 states+regions + Nay Pyi Taw = 15 units, ignoring self-administered sub-zones. |
| Kenya | Counties | 47 | Manageable. |
| South Korea | Special/metro cities + provinces | 17 | Standard (includes Seoul, Busan, etc. as top-level units). |
| Colombia | Departments + Bogotá DC | 33 | Standard. |
| Spain | Autonomous communities | 17 | ⚠️ **Note: Spain has 50 provinces, but 17 autonomous communities is the appropriate top-level.** Recommend communities. Includes Canary Islands, Balearic Islands, Ceuta, Melilla. |

### Anomaly decisions needed

Before seeding, confirm the recommended approach for:

- [ ] **Philippines** — 17 regions vs 82 provinces
- [ ] **Turkey** — 12 NUTS regions vs 81 provinces
- [ ] **Thailand** — ~6 geographic groups vs 77 provinces
- [ ] **United Kingdom** — 4 nations (or include Crown Dependencies?)
- [ ] **Pakistan** — how to handle AJK and Gilgit-Baltistan (disputed)
- [ ] **Myanmar** — confirm 15-unit structure
- [ ] **Spain** — 17 communities confirmed, note Ceuta & Melilla inclusion

---

## 6. New Database Schema

### `provinces` table

```sql
id          uuid PRIMARY KEY
country_code  char(2) REFERENCES countries(code) ON DELETE CASCADE
code        varchar(10) UNIQUE  -- e.g. 'US-CA', 'CN-XZ'
name        varchar(100) NOT NULL
population  integer
area_km2    integer
created_at  timestamp DEFAULT now()
```

### `user_provinces` table

```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users(id) ON DELETE CASCADE
province_code varchar(10) REFERENCES provinces(code) ON DELETE CASCADE
visited_at    date
created_at    timestamp DEFAULT now()
UNIQUE(user_id, province_code)
```

---

## 7. Backend Changes

- [ ] New migration: `provinces` table
- [ ] New migration: `user_provinces` table
- [ ] Seed file: provinces for top 30 countries (post anomaly decisions)
- [ ] Update `points.js`: new `calculateCountryPoints` handling all 3 tiers
- [ ] New `regional_value` constants map (tunable, per country or region)
- [ ] New routes: `POST /users/:id/provinces`, `DELETE /users/:id/provinces/:code`, `GET /users/:id/provinces`
- [ ] Update score endpoint to use new formula
- [ ] Update leaderboard to use new scores

---

## 8. Frontend Changes

- [ ] Add Province UI to `CountryDetail.jsx` — list provinces, mark visited
- [ ] Show province exploration % bar (replacing or alongside city bar for tier 1/2)
- [ ] Dashboard — update explored % to reflect province system
- [ ] Add Countries page — consider whether province logging happens here or on country detail

---

## 9. Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-1 | Exact `regional_value` constants per country — calibrate during implementation | Open |
| OQ-2 | Anomaly decisions for Philippines, Turkey, Thailand, UK, Pakistan, Myanmar, Spain | Open — needs user input |
| OQ-3 | Should microstates (Vatican, Monaco, San Marino, etc.) have explorer_ceiling = 0, or a flat small bonus? | Open |
| OQ-4 | How are user-facing province codes displayed? (ISO 3166-2 where available?) | Open |

---

## 10. Implementation Sequence

1. Resolve anomaly decisions (OQ-2)
2. Write migrations for `provinces` and `user_provinces`
3. Seed province data for top 30 countries
4. Rewrite `points.js` with tiered formula
5. Calibrate `regional_value` constants (OQ-1)
6. New province API routes + tests
7. Update score/leaderboard endpoints
8. Frontend: province UI on CountryDetail
9. Frontend: dashboard exploration % update
10. Migration script: orphan Tier 2 city data, map Tier 1 city visits to bonus system
