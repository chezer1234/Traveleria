# Points System

How Traveleria calculates scores. All logic lives in `server/src/lib/points.js` (mirrored byte-for-byte in `client/src/lib/points.js` for the local-first client — see `make check-points-parity`).

Full design history and worked examples behind the current formula: [docs/features/points-redesign.md](features/points-redesign.md).

---

## Visit Base (the score you see)

```
visit_base = distance_multiplier x (tourism_score + danger_score)
```

No floor or cap on the raw calculation beyond a defensive `BASE_CAP` of 200 — the country **total** (below) is what's guaranteed a minimum, not this number alone. Microstates get flat points instead (Vatican=1, Monaco/San Marino/Liechtenstein/Andorra=2, Singapore=3); Antarctica gets a flat 100 for everyone regardless of home country (see [Overrides](#overrides)).

Country size does **not** appear here — it only affects the explorer ceiling (below). A country's land area is a reasonable proxy for "how much is there to explore," but not for "how hard was it to get here," so it was removed from the visible score.

### Distance Multiplier

Based on great-circle (haversine) distance from the user's home country capital to the target country's capital.

```
distance_multiplier = 1 + log2(distance_km / 1000 + 1)
```

| Distance | Multiplier | Example |
|----------|-----------|---------|
| 0 km | 1.0 | Your own country |
| 350 km | 1.4 | UK to France |
| 1,000 km | 2.0 | UK to Germany |
| 5,000 km | 3.6 | UK to USA (east coast) |
| 10,000 km | 4.5 | UK to Thailand |
| 17,000 km | 5.2 | UK to Australia |

Uses lat/lng stored on each country row. Unchanged from the original distance-based rebalance.

### Tourism Score

How hard the country is to visit, measured by tourist-to-population ratio.

```
tourism_score = min(20, log2(population / annual_tourists + 1) x 5)
```

Capped at 20 to prevent countries with almost zero tourists (North Korea: 5,000/year) from dominating. The weight moved from 3.0 to 5.0 in the danger-score redesign — once size stopped propping up every country's visible score, tourism needed more resolution at the low end so close, easy, touristy countries didn't all collapse toward the same floor value. Raising the weight (rather than the cap) deliberately leaves already-capped countries like North Korea untouched, since it's the cap — not the weight — that determines their score once they're saturated.

| Ratio (pop/tourists) | Score | Difficulty label | Example |
|---------------------|-------|-----------------|---------|
| < 0.2 | ~1.7 | Very easy to visit | Andorra, Bahrain |
| 0.2 - 1 | 1.7-5 | Easy to visit | France, Thailand |
| 1 - 10 | 5-17 | Moderate | Laos, Germany |
| 10 - 100 | 17-20 (near cap) | Hard to visit | India, Nigeria |
| > 100 | 20 (cap) | Very/extremely hard to visit | Bangladesh, Chad, North Korea |

### Danger Score

How much real travel risk the country carries, from a per-country `advisory_level` (1–4).

```
danger_score = (advisory_level - 1) / 3 x 6.0
```

`advisory_level` is meant to be a blended consensus of government travel-advisory feeds — **not** crime statistics. Crime data actively misleads here: authoritarian states with total internal control (North Korea) often report near-zero violent crime, which would make them look *safer* than reality. Advisory levels already fold in political risk, detainment risk, and unrest, which is what "danger" needs to mean for this formula.

**Data status:** `advisory_level` is currently seeded only for the ~35 countries this feature was designed and tested against (see the `ADVISORY_LEVELS` table in `server/src/db/seeds/01_countries.cjs`), based on general knowledge of current travel-advisory posture — **not** a real sourced blend yet. Every other country defaults to level 1 (no elevated risk). This is flagged explicitly as provisional; see the Open Questions in [points-redesign.md](features/points-redesign.md).

| `advisory_level` | Meaning | Danger score |
|---|---|---|
| 1 | No restrictions | 0.0 |
| 2 | Some heightened risk | 2.0 |
| 3 | Advised against travel to parts of the country | 4.0 |
| 4 | Advised against all travel | 6.0 |

### Size Score (no longer part of the visit base)

```
size_score = log10(area_km2 / 1000 + 1) x 2
```

Still computed the same way as before — it just no longer feeds `visit_base`. It's used only in `explore_base`, below.

| Country | Area | Score |
|---------|------|-------|
| Malta | 316 km2 | 0.5 |
| Belgium | 30,528 km2 | 3.0 |
| UK | 242,495 km2 | 4.8 |
| India | 3,287,263 km2 | 7.0 |
| Russia | 17,098,242 km2 | 8.5 |

---

## Explore Base (drives the exploration ceiling only)

```
explore_base = distance_multiplier x (tourism_score + danger_score + size_score)
```

A second number, computed alongside `visit_base` but never shown to the user as "why you scored X" — it exists purely to size the explorer ceiling below. Size legitimately belongs here ("how much is there to see"), even though it doesn't belong in the visible score. Danger still raises this number too, so a dangerous-but-accessible country (Iran, Russia) stays *more* rewarding to fully explore, not less — the coupling to danger is deliberate.

---

## Explorer Ceiling

The maximum bonus points available for exploring within a country.

```
explorer_ceiling = explore_base x log10(area / regional_value + 1)
```

Same shape as before, just driven by `explore_base` instead of a single combined base.

### Regional Values

Inversely proportional to average population per region. Dense regions (more to discover per km2) get lower values = more explorer points. Sparse regions get higher values = fewer.

| Region | Regional Value | Effect |
|--------|---------------|--------|
| Asia | ~10,000 | Most explorer per km2 |
| South America | ~22,800 | High |
| Africa | ~32,900 | Moderate |
| North America | ~32,000 | Moderate |
| Middle East | ~41,500 | Moderate |
| Europe | 50,000 (anchor) | Baseline |
| Oceania | ~273,500 | Least explorer per km2 |

---

## Exploration Points

How users earn explorer points by visiting places within a country.

### Country Tiers

| Tier | Countries | How to explore |
|------|-----------|---------------|
| Tier 0 | US, China | Deeper state/province system — visit + experiences + cities + sub-region bonus |
| Tier 1 | Top 10 by population (CN, IN, US, ID, PK, BR, NG, BD, RU, MX) | Visit provinces |
| Tier 2 | Ranks 11-30 by population (JP, DE, FR, GB, IT, ES, etc.) | Visit provinces |
| Tier 3 | All others | Visit top-15 cities |
| Microstate | VA, MC, SM, LI, AD, SG | Flat points, no exploration |
| Antarctica | AQ | Flat 100 points, no exploration (see [Overrides](#overrides)) |

### Province/Experience Weighting — population-INVERSE

```
weight(province) = log10(national_population / max(province_population, 100000) + 1)
province_max (x)  = (weight / sum of all weights) x explorer_ceiling
```

**A province fewer people live in is worth more, not less.** This replaced a population-*proportional* model that rewarded visiting the capital over anywhere rural — backwards from what the game wants to reward. The log keeps a sparse province from swallowing the whole ceiling; the `100,000` floor stops a near-zero-population province (bad or missing data) from dominating the weighting entirely. Weights are normalized to sum to 1, so fully exploring a country still earns exactly the full explorer ceiling, regardless of which provinces that credit comes from.

This is the same weighting used for Tier 0's visit/experience split (90%/50% of `x`, unchanged — see `docs/features/tier-0-nations.md`) and the sub-region bonus (`0.5 × Σx` for a completed sub-region) — both now receive the new weighted `x` instead of the old population-proportional one.

### City Exploration (Tier 3)

Unchanged — flat per-city points, not weighted by population:

```
0.5 pts per visited major city, 0.25 pts per Tier 0 "additional" city
```

---

## Overrides

Two countries bypass the formula entirely — not because the formula is wrong for everyone, but because their underlying data doesn't support it.

### North Korea

`visit_base` is still fully formula-driven — danger and tourism correctly push it up. But `explorer_ceiling` is forced to **0**: there's no genuine tourist access to provinces or cities, and the current dataset has zero seeded North Korean cities, so a nonzero ceiling would just be unearnable fiction.

### Antarctica

A flat **100 points**, the same for every user regardless of home country. Antarctica has no usable population or tourism data — the previous formula-driven score leaned heavily on land area (~8.3 of its ~28–45 point total, see `docs/features/antarctica.md`), which stopped being a valid basis once size left the visible score. Distance-from-home is also not a meaningful difficulty signal here the way it is for every other country — almost all Antarctic tourism funnels through the same handful of expedition gateways regardless of where the traveler started. 100 points was anchored deliberately just below North Korea's formula-driven score (111.1), so it reads as extreme without being declared the single hardest achievement in the game.

---

## Example: Laos (from UK)

| Factor | Value | Contribution |
|--------|-------|-------------|
| Distance | 9,301 km | x4.36 multiplier |
| Tourism | 7.3M pop / 4.8M tourists = Moderate | +6.66 |
| Danger | advisory_level 1 | +0.00 |
| **Visit base** | 4.36 x (6.66 + 0.00) | **= 29.08** |
| Size (explore base only) | 236,800 km2 (similar to UK) | +4.75 |
| Explore base | 4.36 x (6.66 + 0.00 + 4.75) | = 49.82 |
| Explorer ceiling | 49.82 x log10(236800/10000 + 1) | **= 69.37** |
| **Max total** | visit base + ceiling | **= 98.45** |

---

## Parameters

All constants are at the top of `server/src/lib/points.js`:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `TOURISM_WEIGHT` | 5.0 | Multiplier on log-scaled tourism ratio |
| `TOURISM_CAP` | 20.0 | Max tourism score (prevents single-factor dominance) |
| `SIZE_WEIGHT` | 2.0 | Multiplier on log-scaled area (explore base only) |
| `DANGER_CAP` | 6.0 | Max danger score — deliberately smaller than tourism's, so it nudges rather than dominates |
| `FLOOR` | 1.0 | Minimum **country total** (visit base + exploration), not the visit base alone |
| `BASE_CAP` | 200.0 | Defensive maximum on visit base / explore base |
| `FLOOR_POP` | 100,000 | Minimum population used in province/experience weighting |
| `AQ_OVERRIDE_POINTS` | 100 | Flat Antarctica score, same for every user |
| `EUROPE_ANCHOR` | 50,000 | Regional value anchor for Europe |

---

## Score Breakdown UI

The country detail page (`/countries/:code`) shows a plain-English explanation of every factor:

- "How far is it?" — distance in km, percentile ranking
- "How hard is it to visit?" — tourism difficulty label, tourist ratio in words
- "How risky is it?" — travel advisory level and what it adds
- "How big is it?" — area with real-world comparison (now explicitly framed as feeding exploration, not the visit score)
- "Exploration bonus" — progress bar with provinces/cities visited

The API returns a `breakdown` object on `GET /api/countries/:code` with all the data the UI needs. Microstates and Antarctica return a simplified `{ isMicrostate | isFlatOverride, explanation }` shape instead, since the per-factor breakdown doesn't apply to a flat override.
