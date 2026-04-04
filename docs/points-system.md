# Points System

How TravelPoints calculates scores. All logic lives in `server/src/lib/points.js`.

---

## Base Points

```
base = distance_multiplier x (tourism_score + size_score)
```

Clamped to floor 5, cap 200. Microstates get flat points instead (Vatican=1, Monaco/San Marino/Liechtenstein/Andorra=2, Singapore=3).

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

Replaces the old discrete regional multiplier table. Uses lat/lng stored on each country row.

### Tourism Score

How hard the country is to visit, measured by tourist-to-population ratio.

```
tourism_score = min(20, log2(population / annual_tourists + 1) x 3)
```

Capped at 20 to prevent countries with almost zero tourists (North Korea: 5,000/year) from dominating.

| Ratio (pop/tourists) | Score | Difficulty label | Example |
|---------------------|-------|-----------------|---------|
| < 0.2 | ~1 | Very easy to visit | Andorra, Bahrain |
| 0.2 - 1 | 1-3 | Easy to visit | France, Thailand |
| 1 - 10 | 3-10 | Moderate | Laos, Germany |
| 10 - 100 | 10-17 | Hard to visit | India, Nigeria |
| 100 - 1000 | 17-20 | Very hard to visit | Bangladesh, Chad |
| > 1000 | 20 (cap) | Extremely hard to visit | North Korea |

### Size Score

Larger countries have more to see and take more effort to cross.

```
size_score = log10(area_km2 / 1000 + 1) x 2
```

| Country | Area | Score |
|---------|------|-------|
| Malta | 316 km2 | 0.5 |
| Belgium | 30,528 km2 | 3.0 |
| UK | 242,495 km2 | 4.8 |
| India | 3,287,263 km2 | 7.0 |
| Russia | 17,098,242 km2 | 8.5 |

---

## Explorer Ceiling

The maximum bonus points available for exploring within a country.

```
explorer_ceiling = base x log10(area / regional_value + 1)
```

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
| Tier 1 | Top 10 by population (CN, IN, US, ID, PK, BR, NG, BD, RU, MX) | Visit provinces |
| Tier 2 | Ranks 11-30 by population (JP, DE, FR, GB, IT, ES, etc.) | Visit provinces |
| Tier 3 | All others | Visit top-15 cities |
| Microstate | VA, MC, SM, LI, AD, SG | Flat points, no exploration |

### Province Exploration (Tiers 1 and 2)

```
province_points = (province_population / national_population) x explorer_ceiling
```

Each province is worth points proportional to its share of the national population.

### City Exploration (Tier 3)

```
exploration_ratio = visited_top15_city_pop / total_top15_city_pop
explorer_points = exploration_ratio x explorer_ceiling
```

---

## Example: Laos (from UK)

| Factor | Value | Contribution |
|--------|-------|-------------|
| Distance | 9,301 km | x4.36 multiplier |
| Tourism | 7.3M pop / 4.8M tourists = Moderate | +4.00 |
| Size | 236,800 km2 (similar to UK) | +4.75 |
| **Base** | 4.36 x (4.00 + 4.75) | **= 38.19** |
| Explorer ceiling | 38.19 x log10(236800/10000 + 1) | **= 53.17** |
| **Max total** | | **= 91.36** |

---

## Parameters

All constants are at the top of `server/src/lib/points.js`:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `TOURISM_WEIGHT` | 3.0 | Multiplier on log-scaled tourism ratio |
| `TOURISM_CAP` | 20.0 | Max tourism score (prevents single-factor dominance) |
| `SIZE_WEIGHT` | 2.0 | Multiplier on log-scaled area |
| `FLOOR` | 5.0 | Minimum base points for any non-microstate |
| `BASE_CAP` | 200.0 | Maximum base points |
| `EUROPE_ANCHOR` | 50,000 | Regional value anchor for Europe |

---

## Score Breakdown UI

The country detail page (`/countries/:code`) shows a plain-English explanation of every factor:

- "How far is it?" — distance in km, percentile ranking
- "How hard is it to visit?" — difficulty label, tourist ratio in words
- "How big is it?" — area with real-world comparison (e.g. "about the same size as the UK")
- "Exploration bonus" — progress bar with provinces/cities visited

The API returns a `breakdown` object on `GET /api/countries/:code` with all the data the UI needs.
