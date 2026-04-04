# Points System Rebalance Plan

**Date:** 2026-04-04
**Status:** Agreed — ready to implement

---

## The Problem

The current baseline formula `pop/tourists × regional_multiplier` produces wild anomalies:

| Country | Region | Current Base | Notes |
|---------|--------|-------------|-------|
| Germany | Europe | 2.12 | Absurd — large country |
| France | Europe | 22.09 | Outlier-corrected (raw was 0.75) — 10x Germany makes no sense |
| Laos | Asia | 3.80 | Incredibly hard to reach from UK, yet nearly the lowest score |
| Australia | Oceania | 10.78 | Literally the other side of the world |
| Chad | Africa | 472.01 | Near maximum — explorer ceiling then explodes this further |
| India | Asia | 192.63 | Very high baseline, explorer ceiling makes total astronomical |

### Root Causes

1. **Single volatile ratio**: `pop/tourists` swings from 0.16 (Malta) to 5,156 (North Korea)
2. **Outlier correction cliff**: Germany at 2.12 just escapes correction; France at 0.75 gets boosted to 22
3. **No distance signal**: Laos and Australia score low despite being incredibly far from the UK
4. **Regional multiplier is arbitrary**: Discrete cultural buckets don't reflect actual travel difficulty
5. **Explorer ceiling uses linear area**: Massive countries (Australia, Russia) get absurd explorer points

---

## Solution: Distance-Based, Log-Scaled, Capped

### Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Distance vs regional multiplier | **Distance replaces regional** | Culture is subjective; distance is measurable and fair |
| Tourism component | **Log-scaled, capped at 20** | Prevents North Korea (ratio 5156:1) from dominating |
| Size component | **Log-scaled, weight 2.0** | Prevents tiny distant islands scoring higher than Japan |
| Explorer ceiling | **Log-scaled area, inverse-population regional values** | Prevents Australia from scoring 53,000 explorer points |

---

## Formulas

### Base Points

```
baseline = max(FLOOR, min(CAP, distance_multiplier × (tourism_score + size_score)))
```

Where:
- `distance_multiplier = 1 + log2(distance_km / 1000 + 1)` — continuous, based on great-circle distance from user's home capital
- `tourism_score = min(TOURISM_CAP, log2(population / annual_tourists + 1) × TOURISM_WEIGHT)`
- `size_score = log10(area_km2 / 1000 + 1) × SIZE_WEIGHT`

### Explorer Ceiling

```
explorer_ceiling = baseline × log10(area_km2 / regional_value + 1)
```

Where `regional_value` is **inversely proportional** to the region's average population:
- High-population regions (Asia) → low regional_value → more explorer points per km² (dense, lots to discover)
- Low-population regions (Oceania) → high regional_value → less explorer points per km² (sparse)
- Europe anchored at 50,000

### Exploration Points (unchanged)

- **Tiers 1 & 2**: Province-based = `(province_pop / national_pop) × explorer_ceiling`
- **Tier 3**: City-based = `(visited_top15_city_pop / all_top15_city_pop) × explorer_ceiling`
- **Microstates**: Flat points (VA=1, MC=2, SM=2, LI=2, AD=2, SG=3)

### Parameters

| Parameter | Value |
|-----------|-------|
| TOURISM_WEIGHT | 3.0 |
| TOURISM_CAP | 20.0 |
| SIZE_WEIGHT | 2.0 |
| FLOOR | 5.0 |
| CAP | 200.0 |
| EUROPE_ANCHOR (regional_value) | 50,000 |

### Inverse Regional Values

| Region | Avg Population | Regional Value | Effect |
|--------|---------------|---------------|--------|
| Europe | ~18M | 50,000 | Anchor |
| Asia | ~115M | 10,000 | More explorer per km² (dense) |
| Middle East | ~22M | 41,476 | Moderate |
| Africa | ~28M | 32,929 | Moderate |
| North America | ~29M | 31,953 | Moderate |
| South America | ~40M | 22,759 | Slightly more explorer per km² |
| Oceania | ~3M | 273,452 | Least explorer per km² (sparse) |

---

## Projected Results (from UK)

### Base + Explorer Totals

| Country | Region | Distance | Base | Explorer | Total | Old Total |
|---------|--------|----------|------|----------|-------|-----------|
| **Top tier** | | | | | | |
| India | Asia | 6,712 km | 102 | 257 | **360** | 192 base only |
| China | Asia | 8,141 km | 90 | 269 | **359** | 55 base only |
| Brazil | S. America | 8,792 km | 99 | 254 | **353** | 96 base only |
| DR Congo | Africa | 6,379 km | 104 | 193 | **297** | 400 base only |
| Indonesia | Asia | 11,719 km | 89 | 203 | **292** | 42 base only |
| Pakistan | Asia | 6,033 km | 99 | 193 | **291** | 70 base only |
| Afghanistan | Asia | 5,707 km | 96 | 175 | **271** | 67 base only |
| **Major destinations** | | | | | | |
| USA | N. America | 5,897 km | 57 | 142 | **200** | 13 base only |
| Australia | Oceania | 16,981 km | 69 | 102 | **171** | 11 base only |
| Russia | Europe | 2,501 km | 47 | 120 | **167** | 6 base only |
| Canada | N. America | 5,361 km | 45 | 113 | **158** | 5 base only |
| Japan | Asia | 9,559 km | 53 | 85 | **138** | 10 base only |
| Vietnam | Asia | 9,235 km | 57 | 87 | **144** | 14 base only |
| Thailand | Asia | 9,531 km | 43 | 74 | **117** | 4 base only |
| **Smaller / closer** | | | | | | |
| Laos | Asia | 9,301 km | 38 | 53 | **91** | 4 base only |
| South Korea | Asia | 8,857 km | 43 | 45 | **87** | 7 base only |
| Cuba | N. America | 7,493 km | 40 | 26 | **65** | 8 base only |
| New Zealand | Oceania | 18,814 km | 44 | 13 | **58** | 5 base only |
| **Europe** | | | | | | |
| Germany | Europe | 932 km | 20 | 18 | **37** | 2 base only |
| Spain | Europe | 1,263 km | 16 | 17 | **33** | 21 base only |
| Italy | Europe | 1,435 km | 18 | 15 | **33** | 20 base only |
| France | Europe | 343 km | 11 | 13 | **25** | 22 base only |
| UK | Europe | 0 km | 9 | 7 | **16** | 19 base only |
| Malta | Europe | 2,089 km | 5 | 0 | **5** | 2 base only |

### Neighbour Sanity Checks

| Pair | Totals | Ratio | Verdict |
|------|--------|-------|---------|
| Germany vs France | 37 vs 25 | 1.5x | Good — similar countries |
| Laos vs Thailand | 91 vs 117 | 1.3x | Good — Thailand bigger but similar distance |
| Afghanistan vs Pakistan | 271 vs 291 | 1.1x | Good — neighbours, similar difficulty |
| Bangladesh vs India | 223 vs 360 | 1.6x | Good — India is 22x larger |
| Australia vs New Zealand | 171 vs 58 | 3.0x | OK — Australia is 29x larger |
| USA vs Canada | 200 vs 158 | 1.3x | Good |
| Japan vs South Korea | 138 vs 87 | 1.6x | Good — Japan is 4x larger |
| North Korea vs South Korea | 218 vs 87 | 2.5x | Good — NK almost impossible to visit |
| Syria vs Lebanon | 136 vs 30 | 4.6x | Largest gap — justified by Syria being 18x larger + 50x fewer tourists |

### Regional Averages

| Region | Base Avg | Base Range | Total Avg | Total Range |
|--------|----------|------------|-----------|-------------|
| Europe | 17 | 5–47 | 29 | 5–167 |
| Asia | 57 | 6–103 | 146 | 6–360 |
| Middle East | 42 | 5–95 | 78 | 5–203 |
| Africa | 67 | 6–105 | 139 | 6–297 |
| North America | 31 | 6–63 | 56 | 6–200 |
| South America | 65 | 34–99 | 172 | 67–353 |
| Oceania | 48 | 5–109 | 60 | 5–171 |

---

## Data Requirements

### New: Capital city coordinates

Each country needs `lat` and `lng` fields added to the seed data for distance calculation.
This replaces the need for the `REGION_MULTIPLIERS` lookup table entirely.

### Removed

- `REGION_MULTIPLIERS` table — replaced by continuous distance
- `applyOutlierCorrection()` — log scaling makes it unnecessary
- `calculateRegionalAverage()` — only existed for outlier correction

---

## UI: Calculation Transparency

The country detail page must explain every factor in **plain language** — no formulas, no `log2`, no jargon. The user should understand *what* is being measured, *why* it matters, and *how much* it contributes, without needing a maths background.

### Design: Score Breakdown Card

```
How Laos is scored                                          38.19 base points
─────────────────────────────────────────────────────────────────────────────

🧭 How far is it?                                          9,301 km from London
   Countries further from your home are worth more.
   Laos is in the furthest 25% of all countries.
                                                            ×4.36 to your score

📊 How hard is it to visit?                                 Moderate
   Laos gets about 4.8 million tourists per year
   for a population of 7.3 million — roughly 1 tourist
   for every 2 people. Countries with fewer tourists
   relative to their population score higher.
                                                            +4.00 to your score

🗺️ How big is it?                                          236,800 km²
   Larger countries have more to see and take more
   effort to travel across. Laos is about the same
   size as the UK.
                                                            +4.75 to your score

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Exploration points                                      up to 53.17 extra points
   You can earn bonus points by exploring deeper —
   visiting provinces or major cities within Laos.
   The more of the country you cover, the more
   bonus points you unlock.

   Explored: 0 of 18 provinces                             0.00 / 53.17 earned

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   Base points:                                             38.19
   Exploration bonus:                                        0.00
   Total:                                                   38.19 / 91.36 possible
```

### Key Principles

1. **Lead with the question, not the number** — "How far is it?" not "Distance multiplier: 4.36"
2. **Give real-world comparisons** — "about the same size as the UK", "1 tourist for every 2 people"
3. **Show the contribution** — each factor shows how many points it adds
4. **Explain the exploration ceiling** — tell users exactly what they need to do to earn more
5. **Show progress** — "0 of 18 provinces" and "0.00 / 53.17 earned" make it a game

### Comparison context (optional, shown below the breakdown)

To help users understand whether a score is high or low:

```
How does Laos compare?
──────────────────────
   Nearby Thailand is worth       117 pts (bigger, similar distance)
   Neighbouring China is worth    359 pts (much bigger, harder to visit)
   Average Asian country:         146 pts
   Average European country:       29 pts
```

### What the API returns

The country detail endpoint should return all the human-readable values:

```json
{
  "score": {
    "base": 38.19,
    "explorerCeiling": 53.17,
    "explorerEarned": 0,
    "total": 38.19,
    "maxTotal": 91.36,
    "breakdown": {
      "distance": {
        "km": 9301,
        "multiplier": 4.36,
        "percentile": 75,
        "explanation": "Laos is 9,301 km from London — in the furthest 25% of all countries"
      },
      "tourism": {
        "population": 7275560,
        "annualTourists": 4791000,
        "touristRatio": "1 tourist for every 2 people",
        "difficulty": "Moderate",
        "points": 4.00,
        "explanation": "Laos gets about 4.8 million tourists a year for a population of 7.3 million"
      },
      "size": {
        "areaKm2": 236800,
        "comparison": "about the same size as the UK",
        "points": 4.75,
        "explanation": "Larger countries have more to see and take more effort to travel across"
      },
      "exploration": {
        "method": "provinces",
        "total": 18,
        "visited": 0,
        "earned": 0,
        "ceiling": 53.17,
        "explanation": "Visit provinces within Laos to earn up to 53 bonus points"
      }
    }
  }
}
```

### Size comparisons

The API should return a relatable size comparison. Lookup table of reference sizes:

| Reference | Area (km²) | Used when country is... |
|-----------|-----------|------------------------|
| London | 1,572 | < 2,000 |
| Luxembourg | 2,586 | 2,000–5,000 |
| Cyprus | 9,251 | 5,000–15,000 |
| Wales | 20,779 | 15,000–30,000 |
| Belgium | 30,528 | 30,000–50,000 |
| Ireland | 70,273 | 50,000–90,000 |
| the UK | 242,495 | 90,000–400,000 |
| France | 640,679 | 400,000–900,000 |
| Egypt | 1,001,449 | 900,000–1,500,000 |
| India | 3,287,263 | 1,500,000–5,000,000 |
| Australia | 7,741,220 | 5,000,000–12,000,000 |
| Russia | 17,098,242 | > 12,000,000 |

### Tourism difficulty labels

| Tourist-to-population ratio | Label | Example |
|----------------------------|-------|---------|
| > 5 tourists per person | Very easy to visit | Andorra, Bahrain |
| 1–5 per person | Easy to visit | France, Thailand |
| 1 tourist per 2–10 people | Moderate | Laos, Ghana |
| 1 per 10–100 people | Hard to visit | India, Nigeria |
| 1 per 100–1000 people | Very hard to visit | Bangladesh, Chad |
| < 1 per 1000 people | Extremely hard to visit | North Korea, Turkmenistan |

---

## Implementation Steps

1. **Add `lat`, `lng` to countries seed data** (`01_countries.js`)
2. **Rewrite base calculation** in `points.js`:
   - Add `haversine()` distance function
   - Replace `calculateRawBaseline()` with log-scaled composite
   - Add `TOURISM_CAP` constant
   - Remove `REGION_MULTIPLIERS`, `applyOutlierCorrection()`, `calculateRegionalAverage()`
   - Update `getRegionalMultiplier()` → `getDistanceMultiplier()`
3. **Rewrite explorer ceiling** in `points.js`:
   - Invert regional value computation (inversely proportional to population)
   - Log-scale the area/regional_value ratio
4. **Update tests** in `points.test.js`
5. **Add score breakdown to country detail API** — return all intermediate values
6. **Add score breakdown to country detail UI** — display the calculation transparently
7. **Update SIZE_WEIGHT from 1.0 to 2.0**

### Files to change
- `server/src/lib/points.js` — core formula rewrite
- `server/src/db/seeds/01_countries.js` — add lat/lng
- `server/__tests__/points.test.js` — update expected values
- `server/src/routes/countries.js` — return breakdown in API
- `client/` — country detail page UI (show breakdown)
