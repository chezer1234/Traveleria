# Experience Update

**Status:** Planning
**Branch:** `claude/friendly-bell-49ykdb`
**Issue:** [#74 — Experience update](https://github.com/chezer1234/Traveleria/issues/74)

---

## What It Does

Generalizes the "loggable experience" mechanic that Tier 0 nations (issue #46) already have for US/China state landmarks into a global system:

- A new **Experiences tab** (bottom nav) — key experiences, top experiences by country, natural wonders, sortable.
- Experiences also surface inside each country's own detail page, in a sub-tab alongside provinces/cities — including for Tier 0 nations, where US/China experiences appear both on the country page *and* the global tab, backed by the same data.
- Real, non-AI stock photography (Wikimedia Commons, CC-licensed, attributed) for marquee experiences.
- Three new experience types, each scored differently because each is a genuinely different kind of achievement:
  1. **Landmarks / world & natural wonders** — reuses the existing Tier 0 province-experience pattern, extended to all countries (not just US/China provinces).
  2. **Country-specific transport** — a curated catalog of ~25-50 real named routes (Trans-Siberian, Shinkansen, Eurostar, etc.).
  3. **Natural disasters** — logging having experienced an earthquake (v1), with magnitude, in a specific country, for points scaled by how severe *and* how rare that magnitude is for that country.

## Why

Issue #74 (Charlie): "special experiences... visiting world wonders... unique animals... exploring specific buildings... I want this to be its own unique tab." The Tier 0 nations feature already proved the core mechanic (province landmarks, `province_experiences` table, pool-based scoring) — this generalizes it rather than inventing something new, and adds two mechanics that don't fit the existing province-scoped model: transport (crosses provinces/countries) and disasters (a logged event, not a place).

---

## Decisions from Q&A (issue #74 thread)

### Disasters — formula

```
disaster_points = 0.05 × x × scalar
scalar = magnitude_component × rarity_component
```

- **`x` = the target country's `visit_base + explorer_ceiling`** (its full explorable value from the user's home country), not `visit_base` alone. Confirmed by Charlie after seeing both options worked out — `visit_base` alone made even severe events round to a few points, which didn't feel earned; the bigger anchor puts a rare, severe event in the same ballpark as fully exploring a solid mid-tier country, without dwarfing a full country visit.
- **Magnitude component** — real USGS magnitude classes: M4.0-4.9 light = 1.0, M5.0-5.9 moderate = 1.5, M6.0-6.9 strong = 2.0, M7.0-7.9 major = 2.5, M8.0+ great = 3.0.
- **Rarity component** — how unusual that magnitude is *for that specific country*, sourced from the real **USGS earthquake catalog** (per-country historical frequency by magnitude band), not hand-assigned tiers. This is the harder half of the work — needs an actual data pull before any of it ships, same rigor bar as `advisory_level` was supposed to meet (and hasn't fully, yet — see [points-redesign.md](points-redesign.md) open questions).
- User logs which country they experienced the event in; the event isn't province-scoped.

**Worked examples** (home country UK), illustrative rarity values pending real USGS sourcing:

| Country | Event | x (visit_base + ceiling) | Scalar | Points |
|---|---|---|---|---|
| Japan | M6 (common there) | 167.77 | 1.0 | 8.39 |
| Japan | M8+ (rare even for Japan) | 167.77 | 3.0 | 25.17 |
| US | M6 (California, fairly common) | 231.94 | 1.5 | 17.40 |
| US | M7+ (rare major event) | 231.94 | 3.13 | 36.24 |
| UK | M4 (very rare for UK) | 16.43 | 2.5 | 2.05 |

For reference, US visit_base alone (just landing in the country, no exploration) is 44.9 from the UK; Laos' full `x` is 98.45. So a rare M7+ US quake (36.24) sits comfortably below a full country visit, and a common Japanese M6 (8.39) stays a modest bonus rather than a dominant score source.

**v1 scope:** earthquakes only, shipped end-to-end (data model, USGS sourcing, formula, UI) before extending. The same `magnitude × rarity` pattern extends cleanly to:
- **Volcanic eruptions** — Smithsonian Global Volcanism Program's VEI 0-8 scale, same public/structured shape as USGS.
- **Tropical cyclones/hurricanes** — Saffir-Simpson category 1-5, NOAA HURDAT historical data.

Both are real, sourceable scales — good next additions once the earthquake mechanic (and its data pipeline) is proven, per Charlie ("we could try to do multiple... give me examples of points of everything as we continue").

### Transport

- Catalog of **~25-50 real named routes** (Trans-Siberian, Shinkansen, Eurostar, etc.) — a curated data-entry task, not a formula problem.
- Per-route value: small, in the same range as existing Tier 0 experience/city bonuses (well under a point to a few points each) rather than a flat headline number — needs a concrete number per route once the catalog is drafted, optionally scaled by the host country's tourism-difficulty score so routes in harder-to-visit countries are worth more (same "harder nation = more points for things within it" logic as disasters).

### Landmarks / wonders

- Extends the existing `province_experiences` pattern beyond Tier 0's US/China provinces. Needs a decision on whether non-Tier-0 experiences attach to a province (where one exists) or sit at the country level directly — likely country-level for most countries, since only Tier 0 has meaningful province infrastructure today.

### Photos

- Real photography from Wikimedia Commons, CC-licensed with attribution — not AI-generated. Sourced per experience alongside its data-entry, not as a separate batch pass. Examples already verified as available: [Machu Picchu](https://commons.wikimedia.org/wiki/File:Machu_Picchu,_Per%C3%BA,_2015-07-30,_DD_60.JPG) (CC BY-SA 4.0), [Shinkansen E5](https://commons.wikimedia.org/wiki/File:Shinkansen_(bullet_train)_%EF%BC%9A_The_Hayabusa_super_express_(Series_E5_train).JPG) (CC BY-SA 4.0).

### Placement

- Experiences appear **both** on the country detail page (sub-tab, alongside provinces/cities) and on the global Experiences tab — same underlying data, two views. Confirmed by Charlie.

---

## Open Questions

- Exact per-route transport point value (flat small number vs. tourism-scaled) — not yet fixed.
- Where non-Tier-0 landmark experiences attach in the data model (province vs. country-level row).
- USGS data pull: is this a one-time seed (like `advisory_level`) or does it need periodic refresh? Given `advisory_level`'s "provisional, ~35 countries only" state, worth deciding up front whether experience data should hold itself to a stricter bar before shipping widely.
- Anti-abuse: can a user log the same magnitude-band disaster in the same country more than once? Existing patterns in the app (province/city visited = boolean) suggest no — one log per country per magnitude-band — but not yet confirmed with Charlie.
- Global tab layout/sort — not yet designed (this doc currently covers data model + scoring only).

---

## Data Model (draft, pending implementation)

Not yet built. Sketch based on the existing Tier 0 schema (`province_experiences` / `user_province_experiences` from `20260701001_add_tier0_schema.cjs`):

- Extend or generalize `province_experiences` for non-Tier-0 landmark/wonder experiences.
- New `transport_experiences` (or similar) table: route name, countries it passes through, point value.
- New `disaster_logs` (or similar) table: user, country, disaster type, magnitude/severity band, computed points — plus a reference table for per-country USGS-sourced rarity data once pulled.

---

## Next Steps

1. Pull real USGS per-country earthquake frequency-by-magnitude data to replace the illustrative rarity values above.
2. Resolve the open questions, especially transport point value and landmark attachment model.
3. Design the data model and migrations.
4. Build the earthquake logging mechanic end-to-end (data, scoring, UI) as the v1 slice.
5. Global Experiences tab UI + country-page sub-tab.
6. Extend to transport catalog, then volcanic eruptions / cyclones.
