# Bonus Points — UN Subregion Exploration

**Status:** Planning
**Branch:** `feature/bonus-points-tab`

---

## What It Does

A new top-level tab ("Bonus Points") lets users see the world divided into UN M.49 subregions and track how many countries they've visited within each one. Visiting a subregion for the first time earns a **visit bonus**; visiting every country in it earns an equal **completion bonus** — so a full sweep of a subregion is worth double.

The visit bonus scales with how remote the subregion is from the user's home country and how difficult its countries are to visit (average tourism difficulty). Your home subregion always yields 0 visit points, but completing every country in it still earns a flat 5 points.

---

## Subregions (UN M.49 Geoscheme)

| Subregion | Countries (approx.) | Anchor centroid |
|---|---|---|
| **Africa** | | |
| Northern Africa | 7 | 25°N, 17°E |
| Western Africa | 17 | 12°N, 2°W |
| Middle Africa | 9 | 4°N, 22°E |
| Eastern Africa | 18 | 2°S, 36°E |
| Southern Africa | 5 | 29°S, 25°E |
| **Americas** | | |
| Northern America | 3 | 48°N, 100°W |
| Central America | 7 | 15°N, 87°W |
| Caribbean | 13 | 18°N, 72°W |
| South America | 12 | 14°S, 55°W |
| **Asia** | | |
| Western Asia | 18 | 33°N, 44°E |
| Central Asia | 5 | 43°N, 63°E |
| Southern Asia | 9 | 25°N, 74°E |
| South-Eastern Asia | 11 | 13°N, 106°E |
| Eastern Asia | 8 | 35°N, 115°E |
| **Europe** | | |
| Northern Europe | 10 | 60°N, 15°E |
| Western Europe | 9 | 50°N, 8°E |
| Southern Europe | 15 | 42°N, 14°E |
| Eastern Europe | 10 | 52°N, 30°E |
| **Oceania** | | |
| Australia & New Zealand | 4 | 30°S, 145°E |
| Melanesia | 5 | 10°S, 155°E |
| Micronesia | 7 | 9°N, 160°E |
| Polynesia | 10 | 15°S, 170°W |

> Exact country-to-subregion assignments will follow the UN M.49 list. Disputed territories follow the same rules as in the existing `disputed` field on provinces.

---

## Points Formula

### Visit Bonus — X

Earned the moment a user logs their **first country visit** in a subregion.

```
X = round( 60 × ( 0.5 × dist_norm + 0.5 × tourism_norm ) )
```

Where:

- **`dist_norm`** = normalised distance from the user's home country to the subregion centroid (haversine, same as country scoring).
  ```
  dist_norm = log2(km / 1000 + 1) / log2(20 + 1)
  ```
  `log2(21) ≈ 4.39` caps normalisation at ~20 000 km (roughly antipodal), giving a 0–1 range.

- **`tourism_norm`** = average of the individual `tourism_score` values of all countries in the subregion, normalised by the cap of 20.
  ```
  tourism_norm = mean(tourism_score_i) / 20
  ```
  `tourism_score` is already calculated per country in `points.js` as `min(20, log2(pop/tourists + 1) × 3)`.

**Home subregion exception:** If the user's home country is in this subregion, `X = 0` (no visit bonus).

### Completion Bonus

Earned when the user has visited **every country** in the subregion.

```
completion_bonus = X   (same value as the visit bonus)
```

So the maximum a user can earn from one subregion is **2X**.

**Home subregion exception:** Completion always yields a flat **5 points**, regardless of the formula.

### Summary table (example, UK home)

| Subregion | Est. km | tourism_norm | X (visit) | completion | total |
|---|---|---|---|---|---|
| Western Europe (home) | 0 | — | 0 | 5 | 5 |
| Northern Europe | ~1 500 | ~0.25 | ~17 | ~17 | ~34 |
| Western Asia | ~4 000 | ~0.60 | ~38 | ~38 | ~76 |
| Melanesia | ~14 000 | ~0.70 | ~56 | ~56 | ~112 |
| Polynesia | ~17 000 | ~0.55 | ~57 | ~57 | ~114 |

> These are illustrative. Exact values depend on home country lat/lng and live tourism data from the seed.

---

## UI

### New tab — "Subregions"

A top-level nav tab alongside Map, Leaderboard, etc.

**Layout:**
- World map at the top — each subregion shaded in its own colour (22 distinct colours, grouped loosely by continent family). Visited subregions shown brighter; unvisited muted.
- Below the map: a card grid (or accordion by continent) — one card per subregion showing:
  - Subregion name + colour swatch
  - Countries visited / total (e.g. `3 / 11`)
  - Progress bar toward completion
  - Points earned so far (visit bonus, if triggered) and potential completion bonus remaining
  - List of visited countries (ticked) and unvisited (greyed out)

**State:**
- Subregion card turns fully bright once the user has visited ≥1 country (visit bonus unlocked).
- A trophy/star icon appears when fully completed.
- Home subregion is labelled "Home region" and shows the flat 5-point completion target.

---

## Data Model Changes

### `countries` table
Add a `subregion` column (string, e.g. `"Western Europe"`). Populated via seed update to `01_countries.js`.

### `user_subregion_bonuses` table (new)
Tracks which bonuses have been paid out — avoids recalculating on every request.

```sql
CREATE TABLE user_subregion_bonuses (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subregion   TEXT NOT NULL,
  visit_bonus INTEGER NOT NULL DEFAULT 0,   -- X, or 0 if home
  completion_bonus INTEGER,                  -- NULL until completed
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, subregion)
);
```

> Alternatively, bonuses could be derived on-the-fly from `user_countries` — no extra table. Trade-off: simplicity vs. query cost. To decide.

---

## Open Questions

1. **Colour palette** — 22 subregions need distinct colours. Group by continent (5 hue families, ~4–5 shades each)? Charlie to sign off on the palette.
2. **Store or derive?** — Should we persist `user_subregion_bonuses` in a table, or compute visit/completion status live from `user_countries`? Live is simpler but hits the DB more on the leaderboard.
3. **Leaderboard integration** — Should subregion bonus points feed into the main user score shown on the leaderboard? If yes, at what weight?
4. **Country assignment** — A handful of countries have disputed/ambiguous UN subregion placement (e.g. Cyprus, Kazakhstan). Confirm assignments before seeding.
5. **Cap** — Should total subregion bonus points be capped (like base points are capped at 200 per country)? Or uncapped — a world completionist deserves all 22 × 2X?
6. **Map library** — The existing world map uses `react-simple-maps`. Does it support subregion-level shading, or do we need a custom TopoJSON with subregion groupings?
