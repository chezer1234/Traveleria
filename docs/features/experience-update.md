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
- **Rarity component** — how unusual that magnitude is *for that specific country*, from real per-country M6+ annual frequency (see Sourced rarity data below), not hand-assigned tiers.
- User logs which country they experienced the event in; the event isn't province-scoped.

**Sourced rarity data.** The live USGS catalog API (`earthquake.usgs.gov/fdsnws/event`) isn't reachable from this environment's network policy, so these come from published secondary summaries (VolcanoDiscovery / worlddata.info seismic-statistics pages, BGS for the UK) rather than a direct catalog pull — good enough to bracket a first tier table, but the real implementation should query the USGS catalog directly once that's possible, the same way `01_countries.js` pulls straight from World Bank/UNWTO/CIA Factbook rather than a summary site.

| Country | Avg M6+ events/year | Source |
|---|---|---|
| Indonesia | ~12.5 | VolcanoDiscovery |
| Japan | ~10.7 (≈20% of world's M6+ activity) | VolcanoDiscovery |
| Chile | ~6.1 | VolcanoDiscovery |
| New Zealand | ~2.5 | VolcanoDiscovery |
| Greece | ~1.51 | VolcanoDiscovery |
| Turkey | ~0.86-1.03 (M7+: ~0.05, i.e. once every ~18.5 yrs) | VolcanoDiscovery / Statista |
| Italy | ~0.77 | VolcanoDiscovery |
| UK | ~0 in the modern record — M5.5 roughly once per century, M4.5 once per decade; no M6+ in the historical catalogue | British Geological Survey |

Bucketed into a rarity multiplier: ≥10/yr → 0.5, 3-9.9/yr → 0.75, 1-2.9/yr → 1.0, 0.3-0.9/yr → 1.5, <0.3/yr (historically rare) → 2.5. **US, Mexico, and Nepal aren't sourced yet** — flagged the same way `advisory_level` flags its ~35-country coverage as provisional; fill these in before shipping rather than guessing.

**Worked examples** (home country UK), using the sourced rarity buckets above:

| Country | Event | x (visit_base + ceiling) | Rarity | Scalar | Points |
|---|---|---|---|---|---|
| Indonesia | M6 (very common there) | 376.38 | 0.5 | 1.0 | 18.82 |
| Japan | M6 (common there) | 167.77 | 0.5 | 1.0 | 8.39 |
| Chile | M6 (frequent) | 182.27 | 0.75 | 1.5 | 13.67 |
| Turkey | M6 (occasional) | 92.16 | 1.0 | 2.0 | 9.22 |
| Greece | M6 (occasional) | 15.51 | 1.0 | 2.0 | 1.55 |
| Italy | M6 (uncommon) | 29.70 | 1.5 | 3.0 | 4.46 |
| UK | M4 (very rare for UK) | 16.43 | 2.5 | 2.5 | 2.05 |

For reference, US visit_base alone (just landing in the country, no exploration) is 44.9 from the UK; Laos' full `x` is 98.45. A rare, severe event stays below the value of a full country visit, and a common event in a highly active country (Indonesia, Japan) stays a modest bonus rather than a dominant score source.

**Open catch: country-level rarity breaks down for geographically huge countries.** The US and China (already Tier 0, with real province infrastructure) have wildly uneven internal seismicity — an M6 in California is unremarkable, the same M6 in most of the rest of the US would be historic. A single US-wide rarity number can't represent both. Worth deciding whether Tier 0 countries get *province-level* rarity (reusing the province data model, same as their experiences) while every other country stays country-level.

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
- Rarity data needs a real USGS catalog pull (not secondary-sourced summaries) for production, and coverage is still missing for the US, Mexico, and Nepal at minimum — same "provisional, partial coverage" state `advisory_level` is in today. Is this a one-time seed or does it need periodic refresh?
- Should Tier 0 countries (US, China) get *province-level* earthquake rarity instead of one country-wide number, given how unevenly seismicity is distributed within them? (see "Open catch" under Disasters above)
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

1. Rarity data sourced for 8 countries from secondary summaries (see table above) — still need a direct USGS catalog pull (blocked from this sandboxed environment, doable outside it) plus coverage for the US, Mexico, Nepal, and any other country in scope.
2. Resolve the remaining open questions, especially transport point value, landmark attachment model, and province- vs. country-level rarity for Tier 0.
3. Design the data model and migrations.
4. Build the earthquake logging mechanic end-to-end (data, scoring, UI) as the v1 slice.
5. Global Experiences tab UI + country-page sub-tab.
6. Extend to transport catalog, then volcanic eruptions / cyclones.
