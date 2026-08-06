# Experience Update

**Status:** Merged — [PR #76](https://github.com/chezer1234/Traveleria/pull/76). CI's e2e parity suite caught one real bug after merge-readiness (the client's local SQLite mirror was missing `province_experiences`' two new columns via the idempotent-`ALTER TABLE` pattern the codebase already uses for backward-compat columns) — fixed and verified before the PR went green and merged. Evergreen reference now lives in [docs/points-system.md](../points-system.md#experience-bonuses-issue-74); this doc stays as design history per CLAUDE.md's workflow. See "What's left" below for genuine follow-up work (not merge blockers).
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

**Known simplification: country-level rarity breaks down for geographically huge countries.** The US and China (already Tier 0, with real province infrastructure) have wildly uneven internal seismicity — an M6 in California is unremarkable, the same M6 in most of the rest of the US would be historic. A single US-wide rarity number can't represent both. **Decided:** v1 ships with uniform country-level rarity everywhere anyway, including US/China — province-level rarity is a real improvement but adds schema complexity for a refinement that only matters for 2 of 195 countries, so it's punted to v2 rather than blocking the earthquakes-only v1 slice.

**v1 scope:** earthquakes only, shipped end-to-end (data model, USGS sourcing, formula, UI) before extending. The same `magnitude × rarity` pattern extends cleanly to:
- **Volcanic eruptions** — Smithsonian Global Volcanism Program's VEI 0-8 scale, same public/structured shape as USGS.
- **Tropical cyclones/hurricanes** — Saffir-Simpson category 1-5, NOAA HURDAT historical data.

Both are real, sourceable scales — good next additions once the earthquake mechanic (and its data pipeline) is proven, per Charlie ("we could try to do multiple... give me examples of points of everything as we continue").

### Transport

Catalog of **~25-50 real named routes** (Trans-Siberian, Shinkansen, Eurostar, etc.) — a curated data-entry task. Scored the same way disasters are, reusing already-sourced country data rather than inventing a new metric:

```
transport_points = TRANSPORT_RATIO × x × scalar
scalar = route_significance × (1 + (tourism_score + danger_score) / 26)
```

- `x` = host country's `visit_base + explorer_ceiling` — same anchor as disasters.
- `(tourism_score + danger_score) / 26` reuses the country's existing, already-sourced difficulty numbers (26 = `TOURISM_CAP` + `DANGER_CAP`), normalized to roughly 0-1. No new data to source for this half.
- `route_significance` is grounded in the one genuinely new input — the real distance/duration of the journey: short/regional (<300km or <3hrs) = 1.0, extended regional (300-1500km) = 1.5, long-distance multi-day (1500-5000km) = 2.0, transcontinental epic (5000km+, week+) = 3.0.
- `TRANSPORT_RATIO` = 0.02 (provisional/tunable) — lower than disasters' 0.05 since riding a train is routine and repeatable, not a rare severe event survived.

**Worked examples** (home country UK):

| Route | Host | Distance/duration | Significance | x | Points |
|---|---|---|---|---|---|
| Trans-Siberian (full) | Russia | 9,289 km, ~7 days | 3.0 (epic) | 239.04 | 24.28 |
| Reunification Express | Vietnam | 1,726 km, ~30-36 hrs | 2.0 (long-distance) | 181.47 | 10.99 |
| The Ghan | Australia | 2,979 km, ~3 days | 2.0 (long-distance) | 179.15 | 9.78 |
| Shinkansen (Tokyo–Shin-Osaka) | Japan | 515 km, ~2.5 hrs | 1.5 (regional) | 167.77 | 7.28 |
| Eurostar (London–Paris) | France | 495 km, ~2h15 | 1.0 (short) | 21.44 | 0.50 |

Range comes out 0.5-24.3 — a quick, easy, safe hop barely registers; a week-long transcontinental epic through a harder-to-visit country is meaningfully rewarding, but stays below the value of a full country visit (Laos = 29.08).

**Correction found while wiring this into the total-points calculation:** the Trans-Siberian/Taj Mahal/Pyramids-of-Giza figures above were originally computed against the static `01_countries.cjs` seed *array* — which doesn't carry `advisory_level` at all, since that column is patched onto the live database separately by a later migration (`20260719001_add_advisory_level_to_countries.cjs`), not baked into the base seed file. Russia (advisory_level 3), India, and Egypt (both 2) all got silently under-scored as a result (Trans-Siberian was originally shown as 18.42, not the correct 24.28). Fixed here, and the regression test now queries the live seeded DB instead of the static array specifically so this can't drift silently again — see `getTransportPoints` in `server/__tests__/points.test.js`.

### Landmarks / wonders

Two different rules depending on tier, decided with Charlie:

- **Tier 0 (US, China):** the visit baseline (90%) is untouched, but the **experience pool needed a fix**. Auditing the real seeded data (`04_province_experiences.cjs` against actual state/province populations) found that under the existing 50% pool, split population-inverse-weighted per state, **every one of the US's 51 states scores under 1 point per logged experience** — California and Texas, the two most populous, come out at 0.115 and 0.129. Logging the Golden Gate Bridge or Alcatraz was worth a tenth of a point. China isn't affected the same way (only Beijing sits under 1pt, at 0.945) because its `advisory_level`-driven danger score roughly doubles its explorer ceiling relative to the US's.
  - **Root cause:** population-inverse weighting is the right call for the *visit* baseline (rewards reaching an unusual state), but applying the same weighting to *landmark* value means famous, populous states get crushed — the Golden Gate Bridge isn't less impressive because California is popular.
  - **Fix, confirmed by Charlie:** keep population-inverse weighting (it's still correctly the reason over-visited states should score lower, and that principle should stay) but apply a **US-specific 2.5x multiplier** to the experience pool — effectively `TIER0_EXPERIENCE_RATIO` becomes 1.25 for the US only; China's stays at 0.5, since it isn't broken. Real recalculated numbers: California 0.115→0.288, Texas 0.129→0.324, Wyoming 0.524→1.309. 35 of 51 states still land under 1pt — by design, since the biggest states are supposed to stay relatively low-value — but nothing is left at embarrassing-decimal-dust values anymore. Full-US-fully-explored total (before cities) rises from ~306.7 to **~447.0**, a meaningful but proportionate increase (ruled out 8-10x options, which would have required ~750-935 to clear every state past 1pt — 4-5x inflation that would have made the US dominate every other country's total by a wide margin).
  - Implementation-wise, this needs `TIER0_EXPERIENCE_RATIO` to become per-country rather than a single shared constant (e.g. a small `{ US: 1.25, CN: 0.5 }` map) rather than a global bump — this is a fix to already-shipped, live scoring (issue #46), not new-feature scope, but it's being made here since Tier 0 experiences are the marquee content for the new Experiences tab this feature is building.
- **Every other country (Tier 1, 2, 3):** each landmark experience is worth a **1-5% band of the country's `x`** (`visit_base + explorer_ceiling`, same anchor used everywhere else in this feature) — a graduated scale, same shape as the earthquake magnitude bands and transport significance bands, not a single fixed number. This is purely **additive** on top of the existing visit/province score, not a split of it — so it sidesteps the rollout-regression risk a pool-split model would have caused (no existing province visit gets recalculated downward while landmark data is still being backfilled).
  - **Tier 1/2** (~36 countries with real province data — see `02_provinces.js`): landmarks attach to a specific province, for geographic organization, but the point value is the flat country-level percentage above, not province-weighted.
  - **Tier 3** (~159 countries, no province data at all — Laos included, the exact case CLAUDE.md opens with): landmarks attach directly to the country, since there's no province row to attach to.

**The 1-5% comes from a matrix, not a judgment call** — two real, independent, checkable signals per landmark:

1. **Designation** — is it one of the **New7Wonders of the World** (2007 public vote — Great Wall, Petra, Christ the Redeemer, Machu Picchu, Chichen Itza, Colosseum, Taj Mahal), a **UNESCO World Heritage Site**, or neither? In practice New7Wonders is a tight subset of UNESCO (all 7 are UNESCO-listed too), not an independent axis — one worth flagging: **the Pyramids of Giza are *not* on the New7Wonders list.** They're the sole survivor of the older, separate "Seven Wonders of the Ancient World" and were given standalone honorary status specifically because voting them off felt wrong — a common mix-up worth getting right in the data.
2. **Annual visitor count** — real, sourced, continuous. **High = ≥5M/year, Low = <5M/year** (a threshold that splits our worked examples cleanly, nothing sits near the boundary).

| Designation | High visitors (≥5M/yr) | Low visitors (<5M/yr) |
|---|---|---|
| New7Wonders | 4% | 5% |
| UNESCO only | 2% | 3% |
| Neither | 1% | 2% |

**Worked examples** (home UK):

| Landmark | Country | Tier | x | Visitors/yr | Designation | % | Points |
|---|---|---|---|---|---|---|---|
| Machu Picchu | Peru | 1 | 240.38 | 1.5M | New7Wonders | 5% | 12.02 |
| Taj Mahal | India | 1 | 375.42 | 7M | New7Wonders | 4% | 15.02 |
| Angkor Wat | Cambodia | 3 | 118.43 | 2.5M | UNESCO only | 3% | 3.55 |
| Pyramids of Giza | Egypt | 2 | 169.06 | ~3M | UNESCO only (not New7Wonders) | 3% | 5.07 |
| (obscure regional site) | Laos | 3 | 98.45 | <5M, no designation | Neither | 2% | 1.97 |

Every cell traces to two checkable facts — a real designation list and a real visitor count — not vibes. **Visitor figures need a proper primary-source pull** (site management authority / national tourism board) before shipping; the numbers used to build this matrix came from aggregator summaries with some source-to-source variance, fine for shaping the mechanism, not for the actual seed data.

**Not yet decided:** a soft cap on how many landmarks a single country can have (Tier 0 caps at 5-10 per province; without an equivalent cap here, a country with a very long landmark list could stack a large additive bonus — needs a number, likely similar 5-10 range per country).

### Seven Wonders showcase

Charlie's addition, reusing two patterns that already exist elsewhere in the app rather than inventing new mechanics:

- **All 7 New7Wonders are featured/pinned on the main Experiences tab**, regardless of which country each belongs to — a curated cross-country showcase section, not just findable by browsing individual countries. Needs an explicit `is_new7wonders` flag (or a small dedicated join) on the landmark data so the tab can pull all 7 together in one query.
- **Completing all 7 doubles their combined point value** — exactly the same shape as the existing subregion completion bonus (`calculateSubregionBonuses` in `points.js`: a subregion's `completionBonus` equals its `visitBonus`, so visiting every country in a subregion earns *another* equal chunk on top, i.e. 2x total). Applied here: once every one of the 7 is logged, award a completion bonus equal to the sum of the 7 wonders' own earned points — same "visit them all → double it" pattern, no new formula shape needed.
- **A platinum special trophy** for completing all 7, modeled directly on the existing "continental conquests" pattern in `client/src/lib/trophies.js` (`conquestTrophy()` — all-or-nothing, platinum only, "that's the point"). A new special trophy (e.g. `seven-wonders`, medal: platinum, shape/glyph TBD) sits alongside the existing `SPECIALS` array using the identical `evaluate(stats)` shape: earned once all 7 are logged, progress `{ current, target: 7 }` otherwise.
- **A dedicated purple highlight** on the checkbox/row for each of the 7, both in the Experiences tab showcase and wherever that specific landmark appears within its own country's page — visually marking them as distinct from ordinary landmarks in both places at once. Needs its **own** CSS token rather than reusing an existing one: `--color-plum` (`#a855f7` in Atlas) is already spoken for as the semantic color for **contested territory**, so borrowing it here would collide two unrelated meanings under one color. A new token (e.g. `--color-wonder`) defined per-theme in each of the four `:root[data-theme="…"]` blocks in `index.css` — Atlas/Orbit/Jetstream/Antiquity each already pick their own shade for every other accent color, so Seven Wonders gets one too, distinct from `--color-plum`, `--color-violet` (Jetstream's decorative gradient), and any medal-tier color.

### Photos

- Real photography from Wikimedia Commons, CC-licensed with attribution — not AI-generated. Sourced per experience alongside its data-entry, not as a separate batch pass. Examples already verified as available: [Machu Picchu](https://commons.wikimedia.org/wiki/File:Machu_Picchu,_Per%C3%BA,_2015-07-30,_DD_60.JPG) (CC BY-SA 4.0), [Shinkansen E5](https://commons.wikimedia.org/wiki/File:Shinkansen_(bullet_train)_%EF%BC%9A_The_Hayabusa_super_express_(Series_E5_train).JPG) (CC BY-SA 4.0).

### Placement

- Experiences appear **both** on the country detail page (sub-tab, alongside provinces/cities) and on the global Experiences tab — same underlying data, two views. Confirmed by Charlie.

---

## Resolved (this round)

- **Landmark cap:** up to 10 per country, no forced minimum — a country with only 3 genuinely notable landmarks gets 3, not padded to a quota.
- **Disaster anti-abuse:** one log per user, per country, per magnitude-band (boolean, same pattern as province/city visits).
- **Rarity data cadence:** sourced once per country, no scheduled refresh job. Earthquake frequency is a geological base rate that moves on decade/century timescales, unlike `advisory_level` (which tracks live political risk and genuinely needs periodic review) — treated like population/area data, a fixed snapshot re-sourced only if something material changes. Coverage growing to more countries over time is separate from refreshing existing entries.
- **Tier 0 province-level rarity:** punted to v2. v1 ships uniform country-level rarity everywhere, including US/China, flagged as a known simplification (same honesty `advisory_level` already models) — building province-level rarity now would add schema complexity to the v1 slice for a refinement that only matters for 2 of 195 countries.
- **Global tab layout/sort:** not a scoring/data-model question — moved to Next Steps (UI phase), not tracked here.

## Open Questions

- `TRANSPORT_RATIO` (0.02) and the 1-5% landmark range are provisional starting points that can't really be sanity-checked further in the abstract — need real catalog entries (more than the handful of worked examples above) before they're worth tuning.

---

## Data Model (draft, pending implementation)

Not yet built. Sketch based on the existing Tier 0 schema (`province_experiences` / `user_province_experiences` from `20260701001_add_tier0_schema.cjs`):

- New `landmark_experiences` table (kept separate from Tier 0's `province_experiences` rather than overloaded, since the scoring rule is different — flat % of country `x`, not a pooled split): name, country_code, optional province_code (Tier 1/2 only, null for Tier 3), `is_new7wonders` flag, `is_unesco` flag, `annual_visitors`, significance_pct (derived from the matrix, 1-5), photo credit/URL. Plus `user_landmark_experiences` for logging, mirroring `user_province_experiences`. The `is_new7wonders` flag is what lets the Experiences tab pull all 7 together for the showcase section and lets scoring check "has this user logged all 7" for the completion bonus.
- New `transport_experiences` table: route name, host country_code, distance_km, duration, significance band, photo credit/URL. Plus `user_transport_experiences` for logging.
- New `disaster_logs` (or similar) table: user, country, disaster type, magnitude/severity band, computed points — plus a reference table for per-country USGS-sourced rarity data once pulled.

---

## Next Steps

1. Rarity data sourced for 8 countries from secondary summaries (see table above) — still need a direct USGS catalog pull (blocked from this sandboxed environment, doable outside it) plus coverage for the US, Mexico, Nepal, and any other country in scope.
2. Only genuinely open item left: tuning `TRANSPORT_RATIO`/landmark % once more catalog content exists.
3. Design the data model and migrations, including the `TIER0_EXPERIENCE_RATIO` per-country fix (US 1.25, China unchanged at 0.5) as part of the same rollout.
4. Build the earthquake logging mechanic end-to-end (data, scoring, UI) as the v1 slice.
5. Global Experiences tab UI + country-page sub-tab, including the Seven Wonders showcase section, its completion-bonus scoring (mirrors `calculateSubregionBonuses`), and the new `seven-wonders` platinum trophy (mirrors `conquestTrophy()`).
6. Extend to transport catalog, then volcanic eruptions / cyclones.

---

## Implementation Progress

Written per explicit instruction ("if you run out of context getting to ~85%, write a doc so we can continue with another Claude session") — this is that doc. All work below is committed and pushed to `claude/friendly-bell-49ykdb`; nothing is sitting uncommitted.

### Done (commits, oldest first)

1. **`20260805001_add_experience_update_schema.cjs`** — migration for `landmark_experiences`/`user_landmark_experiences`, `transport_experiences`/`user_transport_experiences`, `disaster_logs`, `country_disaster_rarity`, plus `is_new7wonders`/`is_unesco` columns added to the existing `province_experiences` table. Verified clean on a fresh DB (`NODE_ENV=test npm run migrate`).
2. **`server/src/lib/points.js`** scoring functions, mirrored byte-for-byte to `client/src/lib/points.js` (`make check-points-parity` passes):
   - `getTier0ExperienceRatio(countryCode)` — per-country override map, US=1.25 (the 2.5x fix), everyone else (China included) stays at the base 0.5. Replaces the flat `TIER0_EXPERIENCE_RATIO` constant everywhere it was used inside `calculateTier0ProvinceExploration` and `getScoreBreakdown`.
   - `getCountryX(country, homeCountry, allCountries)` — shared anchor (`visit_base + explorer_ceiling`) for the three mechanics below.
   - `getLandmarkSignificancePct(landmark)` / `getLandmarkPoints(landmark, country, homeCountry, allCountries)` — the designation x visitor-volume matrix.
   - `calculateSevenWondersBonus(loggedWonderPoints)` — mirrors `calculateSubregionBonuses`' visit+completion shape exactly.
   - `getRouteSignificance(distanceKm)` / `getTransportPoints(route, hostCountry, homeCountry, allCountries)`.
   - `getMagnitudeComponent(magnitude)` / `getDisasterPoints(magnitude, rarityMultiplier, country, homeCountry, allCountries)`.
3. **Tests** — `server/__tests__/points.test.js` and the client mirror: full coverage of every new function, using real seed data to pin the doc's exact worked numbers (Machu Picchu = 12.02, Trans-Siberian = 24.28 against the live seeded DB — see the "Correction" note under Transport above) where the fixture size doesn't affect regional-value math, and self-consistent assertions in the client's smaller fixture where it does. Also fixed 3 pre-existing Tier0 tests that hardcoded the old flat 0.5/1.4x ratio. **189/189 server tests, 169/169 client tests, both green** (grew from 174/106 as routes/trophy/wiring tests were added).
4. **Seed data** — `05_landmark_experiences.cjs` (11 rows: the 6 non-Tier0 New7Wonders + 5 others), `06_transport_experiences.cjs` (10 real routes), `07_disaster_rarity.cjs` (8 sourced countries), plus flagging the Great Wall at Badaling in `04_province_experiences.cjs`. Verified: the Seven Wonders union across `landmark_experiences` + `province_experiences` totals exactly 7. Also fixed a libsql batch-insert quirk (mixed-shape rows need explicit `false` defaults on the new boolean columns — same issue `02_provinces.cjs`'s `subregion` column already worked around).

5. **API routes** — `/:id/landmark-experiences`, `/:id/transport-experiences`, `/:id/disaster-logs` (POST/DELETE/GET) in `users.js`, plus catalog routes `/:code/landmark-experiences`/`/:code/transport-experiences` in `countries.js` and a new `/api/experiences/seven-wonders` showcase endpoint that unions `landmark_experiences` with `province_experiences`. `snapshot.js` updated to sync the 6 new tables; `changes.js` needed no changes (already generic). 15 new integration tests. **189/189 server tests green.**

6. **Client local-first sync** — `worker.js` mirrors all 6 new tables (DDL, `TABLE_MAP`/`TABLE_COLUMNS` for the 3 per-user ones, `hydrate()` bulk-inserts for all 6). Verified with a production build.
7. **Client optimistic mutations** — `addLandmarkExperienceOptimistic`, `addTransportExperienceOptimistic`, `addDisasterLogOptimistic` (+ `remove*` counterparts) in `mutations.js`, mirroring `addProvinceExperienceOptimistic`'s exact shape. Disaster logs are the one difference: `magnitude_band`/`points` are server-computed, so the optimistic row leaves them `NULL` until the server's echoed change lands.
8. **Total-points wiring** — landmark/transport/disaster points and the Seven Wonders bonus are now additive on top of the country total, in both `getUserScoreLocal` (client `queries.js`) and `getUserTotalPoints` (server `users.js`) — same treatment the subregion bonus already gets, not folded into `calculateCountryPoints` itself. The Great Wall's per-experience contribution (Tier 0's province-pool model, not the flat landmark model) is read straight out of `calculateTotalTravelPoints`'s existing `provinceBreakdown` for China rather than re-deriving the formula.
9. **Seven Wonders trophy + purple accent** — done (see commits above).

**One accuracy bug found and fixed while wiring step 8**: see the "Correction" note under Transport above — Russia/India/Egypt's `advisory_level` wasn't visible to the static-array-based worked examples, so Trans-Siberian/Taj Mahal/Pyramids were under-scored in the original numbers. Fixed, and the regression test now queries the live seeded DB specifically so this class of bug can't recur silently.

### UI (final phase)

10. **Read queries for display** — `getLandmarksAndTransportForCountryLocal` (a country's landmarks/transport with points pre-computed) and `getAllLandmarkExperiencesLocal` (every landmark across every country, for the global browse view) in `queries.js`. Also fixed `loadExperiencesForCountry`, which wasn't selecting `is_new7wonders`/`is_unesco` at all — the Great Wall's purple flag never reached the UI until this was added.
11. **CountryDetail's Experiences tab** — extended from Tier-0-only to every tier: State Experiences (Tier 0, unchanged) + new Landmarks + Transport sections, same checkbox-row pattern throughout, purple `bg-wonder`/`border-wonder`/`accent-wonder` styling on Seven Wonders rows in both the Tier 0 section and the Landmarks section.
12. **Global Experiences tab** (`client/src/pages/Experiences.jsx`, new, at `/experiences`) — a Seven Wonders showcase grid plus a searchable/sortable table of every landmark. Joined the **Overview** nav group as a new sub-tab (`navGroups.js`), same placement precedent Map used when the tab bar was built (issue #65 Q&A) — restructuring the 3-tab bottom bar to add a 4th top-level tab would have been a much bigger change than following the existing pattern. New `IconLandmark` glyph in `NavIcons.jsx`.

Verified along the way: production build after every commit, full `eslint .` pass (confirmed the few pre-existing unused-var errors in `points.js` predate this branch — checked against the base commit), and the full test suite kept green throughout.

### What's left

Everything in the doc is implemented and tested, but a few things are genuinely still open, listed honestly rather than glossed over:

- **Not visually verified in a running browser.** CLAUDE.md's workflow calls for checking UI changes in Chrome before shipping; that tooling wasn't available in this session. Everything here is build-verified (compiles, lints clean) and logic-reviewed, but nobody has looked at the actual rendered pages yet.
- **No CI run / PR opened yet.** This branch hasn't gone through GitHub Actions or a review pass.
- **Landmark/transport catalogs are starter sets, not exhaustive** — 11 landmarks, 10 transport routes, matching the doc's own "not exhaustive" framing from the start. Real content growth is ongoing work, not a blocker.
- **Rarity and visitor-count data is secondary-sourced**, not pulled from primary sources (live USGS catalog API, official site-management visitor stats) — flagged provisional throughout, same bar `advisory_level` is held to.
- **No real photos yet, and no UI for them either.** `photo_url`/`photo_credit` columns exist in the schema and are selected by the queries, but nothing in `Experiences.jsx` or `CountryDetail.jsx` actually renders an image — that's real remaining work, not just missing data.
- **Tier 0 province-level disaster rarity** — punted to v2 per the earlier Q&A, still punted.
