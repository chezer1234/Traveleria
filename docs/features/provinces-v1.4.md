# Provinces V1.4

**Status:** In progress
**Issue:** #39
**Branch:** `feature/provinces-v1.4`

## What

Expand the province system to cover Canada, Australia, and all of Europe (excl. microstates). Every country in these groups becomes Tier 1 — province-based explorer scoring — and gets city data for the city-visit bonus.

## Scope

| Change | Countries | Notes |
|--------|-----------|-------|
| Tier 2 → Tier 1 | DE, GB, FR, IT, ES | Already have province data + GeoJSON — code-only change |
| Tier 3 → Tier 1 + new province data | CA, AU | 13 + 8 provinces/territories |
| Tier 3 → Tier 1 + new province data | ~31 European countries | All European countries except microstates |
| Unchanged | VA, MC, SM, LI, AD | Microstates stay as flat-point specials |
| Unchanged | RU | Already Tier 1 (world top-10 population) |

## European countries added

Northern Europe: DK, EE, FI, IS, IE, LV, LT, NO, SE (GB already handled above)
Western Europe: BE, CH (AT, NL, LU already Tier 1 or handled above)
Southern Europe: AL, BA, CY, GR, HR, ME, MK, MT, PT, RS, SI, SK, XK (IT, ES above)
Eastern Europe: BG, BY, HU, MD, PL, UA (CZ, RO already Tier 1)

## Province counts

| Country | Count | Admin level |
|---------|-------|-------------|
| Canada | 13 | 10 provinces + 3 territories |
| Australia | 8 | 6 states + ACT + NT |
| Poland | 16 | Voivodeships |
| Sweden | 21 | Counties (län) |
| Ukraine | 27 | 25 oblasts + Kyiv city + Sevastopol (disputed) |
| Switzerland | 26 | Cantons |
| Norway | 11 | Counties (2020–2024 structure) |
| Hungary | 20 | 19 counties + Budapest |
| Croatia | 21 | 20 counties + Zagreb City |
| Finland | 19 | Regions (maakunta) |
| ... | ... | ... |

## How it works

### Tier promotion

`TIER_1_CODES` in `server/src/lib/points.js` and `client/src/lib/points.js` is updated. Tier 1 and Tier 2 both use province-based explorer scoring, so moving DE/GB/FR/IT/ES from Tier 2 → Tier 1 has no scoring effect — it's a classification change.

### Province data

A new migration (`20260628001_add_v14_provinces_cities.cjs`) inserts province and city records for all new countries. Existing DBs are backfilled; fresh DBs use the seeds (which have been updated).

### Province maps

`scripts/generate-province-geo.js` is extended to include all new countries. Run `node scripts/generate-province-geo.js` to regenerate `client/public/geo/` files. Countries where Natural Earth admin-1 codes don't match our province codes just won't produce a GeoJSON file — the province list and scoring still works, only the visual map is absent.

## Questions settled

- **Microstates**: stay as flat-point specials (no provinces)
- **All of Europe**: yes, all ~44 countries (excl. microstates)
- **Canada**: all 13 (provinces + territories)
- **Australia**: all 8 (states + ACT + NT)
