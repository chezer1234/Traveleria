# Points System Redesign — Danger, Explore-Base Split & Population-Inverse Exploration

**Status:** Planning — formula agreed via Q&A, several constants still placeholders
**Date:** 2026-07-19
**Related docs:** [points-system.md](../points-system.md) (current evergreen reference), [points-rebalance-plan.md](../points-rebalance-plan.md) (predecessor rebalance, April 2026), [tier-0-nations.md](tier-0-nations.md), [antarctica.md](antarctica.md)

---

## What

A second-generation rebalance of the scoring engine in `server/src/lib/points.js`. Three changes, decided together because they interact:

1. **Country size no longer counts toward the visit score.** Safety, development-adjacent difficulty, and a new **danger score** take its place. Size still legitimately drives the *exploration* ceiling (more land plausibly means more to see), just not the "how hard was it to get here" number.
2. **Province/experience points flip from population-proportional to population-*inverse***. Today, visiting a country's capital region is worth more than visiting a sparsely populated province. That's backwards — the redesign rewards going somewhere fewer people go.
3. **`TOURISM_WEIGHT` moves from 3.0 to 5.0**, and the total-score floor moves from a per-component `FLOOR=5` to a total-level `FLOOR=1`, together fixing a clustering problem the first two changes exposed (see Q&A Log).

## Why

Charlie's read, paraphrased from the kickoff conversation: exploration points are undervalued and calculated backwards, country size shouldn't determine how hard a country was to visit, and the things that actually make a trip an achievement — safety, distance, tourism rarity — should. Neighbours with similar real-world difficulty still shouldn't be wildly apart (existing principle from the April rebalance), but a country that's genuinely dangerous to reach should be worth more than one that isn't, even if visiting the dangerous one is trivial once you're inside.

---

## The New Formula

### Base points

```
visit_base   = distance_multiplier x (tourism_score + danger_score)
explore_base = distance_multiplier x (tourism_score + danger_score + size_score)
```

Two numbers where there used to be one:

- **`visit_base`** is the score shown to the user — no size. `distance_multiplier` and `tourism_score` are unchanged in shape from today (haversine-based distance; log-scaled tourist/population ratio), except `TOURISM_WEIGHT` moves to **5.0** (see below).
- **`explore_base`** exists only to drive the exploration ceiling. Size belongs to "how much is there to see," not "how hard was it to get here" — so it stays out of the shown score but keeps doing real work downstream.

### Danger score

```
danger_score = (advisory_level - 1) / 3 x DANGER_CAP
```

`advisory_level` (1–4) is a **blended consensus across several government travel-advisory feeds** — not crime statistics. We tested crime-rate data first and rejected it: authoritarian states with total internal control (North Korea) often report near-zero violent crime, which would make them look *safer* than reality. Travel advisories already fold in political risk, detainment risk, and unrest, which is what "danger" needs to mean here. One number per country, refreshed periodically — no live/dynamic scoring (see Q&A Log, round 1).

### Explorer ceiling

```
explorer_ceiling = explore_base x log10(area / regional_value + 1)
```

Same shape as today, fed by `explore_base` instead of the old single base. This is what makes a dangerous-but-accessible country (Russia, Iran) worth *more* to fully explore, not less — confirmed with real seed data: Russia's ceiling goes from 120.1 to 148.6 once danger is added, purely because it's more dangerous, with nothing else about the country changing.

### Country total

```
country_total = max(FLOOR, visit_base + exploration_points + city_points + subregion_bonus)
```

`FLOOR = 1`, applied once to the whole total — not to `visit_base` alone. This matters: flooring the base component directly was what caused France, Spain, Belgium, and Iceland to all collapse to an identical "5" under early testing. Flooring the total instead lets every country's real, differentiated sub-scores show through in the breakdown UI; the floor becomes a backstop for genuinely broken cases (Antarctica) rather than something doing routine work for a third of the map.

### Exploration point distribution (population-inverse)

```
weight(province) = log10(national_pop / max(province_pop, FLOOR_POP) + 1)
province_max (x)  = (weight / sum of all weights) x explorer_ceiling
```

Replaces `(province_pop / national_pop) × explorer_ceiling`. Confirmed with real US and France data: under the old formula, Paris (Île-de-France) was worth 2.38 points and Corsica 0.07 — under the new formula, Corsica (1.10) is worth *more* than Paris (0.39). Same effect for US states: Wyoming goes from 0.22 (old) to worth more than California (previously 15.30, now both land in a healthy 1.3–3.6 range). `FLOOR_POP` is what stops a near-zero-population province from dominating the weighting via the log — tested with 100,000 as a placeholder, not a final decision.

Everything downstream — the Tier 0 visit/experience split (0.9x / 0.5x), city points, sub-region bonus — is mechanically unchanged; it just receives the new `x` values.

### Tourism weight & cap retune

`TOURISM_WEIGHT` moves from **3.0 → 5.0**. `TOURISM_CAP` stays at **20.0**, deliberately not raised alongside the weight.

This came out of a specific problem: once size left the base formula, close/easy/safe European countries (France, Belgium, Iceland, Malta...) all fell so low they needed the floor to rescue them, and a naive floor made them indistinguishable from each other. Two root causes, both traced with real data rather than guessed:

1. **The floor was set too high for the range the redesigned formula naturally produces.** Lowering `FLOOR` from 5 to 1 (applied at the total level) resolved almost all of it on its own — see Q&A Log, round 3.
2. **Tourism alone doesn't have much resolution at the low end**, because size used to prop these countries up and no longer does. Raising `TOURISM_WEIGHT` lifts everyone below the cap — crucially including France, Spain, etc. — without moving North Korea at all, because North Korea's tourist ratio is so extreme (pop/tourists ≈ 5,156) that it's *already* saturated at the cap regardless of weight. Raising `TOURISM_CAP` alongside the weight would have raised North Korea too (it's always pinned exactly at the cap, so the cap doesn't just limit North Korea — for North Korea specifically, it defines its score). Keeping the cap fixed at 20 while raising the weight to 5 was the version that lifts the easy end without touching the hardest country in the dataset. Cost: the number of countries saturated at the tourism cap grows from 21 (already true today, live) to 34 — a real but proportionate trade, not a repeat of the floor-clustering mistake.

---

## Worked Examples

All figures computed against real seed data (`server/src/db/seeds/*.cjs`) via `server/src/lib/points.js`, home country = UK. Illustrative advisory levels used throughout (not yet sourced for real): North Korea/Afghanistan/Syria = 4, Iran/Russia/Myanmar = 3, Mexico/Brazil/Turkey/India = 2, everything else = 1.

### Country-level, before vs after (final formula: weight=5, danger blend, floor=1)

| Country | Old total (live formula, incl. its own FLOOR=5) | New visit-base | New ceiling | **New total** | Advisory lvl |
|---|---|---|---|---|---|
| Belgium | 11.1 | 8.3 | 2.6 | **10.9** | 1 |
| Malta | 5.0 | 2.8 | 0.0 | **2.8** | 1 |
| France | 24.5 | 5.7 | 15.7 | **21.4** | 1 |
| Germany | 37.4 | 16.0 | 23.6 | **39.6** | 1 |
| United States | 199.5 | 44.9 | 187.1 | **232.0** | 1 |
| Russia | 167.5 | 50.6 | 188.5 | **239.0** | 3 |
| North Korea | 218.5 | 111.1 | **0.0 (override)** | **111.1** | 4 |

*(Recomputed directly from `points.js` + real seed data at weight=5. Exact values still depend on final `DANGER_CAP` and advisory sourcing — see Open Questions.)*

### The floor problem and its fix

At `FLOOR=5` applied to the raw base component, France/Spain/Belgium/Iceland all collapsed to an identical value. Checking how many of ~190 countries actually needed floor rescue at different floor values, applied correctly to the *total*:

| Floor value | Countries needing rescue |
|---|---|
| 5 | 10 — including Malta, Luxembourg, Montenegro, Cyprus, Slovenia |
| 3 | 4 |
| 2 | 2 — Antarctica, Malta |
| **1** | **1 — Antarctica only** |

Restricting to Europe specifically at `FLOOR=1`: **0 of 40** European countries need the floor. The clustering wasn't a structural flaw in the formula — the formula already had healthy natural variety (raw scores span roughly 1.5 to 9.6+ among close neighbours); `FLOOR=5` was simply set above that natural range.

### Leaderboard effect (the actual point of the redesign)

Two hypothetical travelers, same 8 countries visited (France, Spain, Belgium, Iceland, USA, Russia, Thailand, Japan) — only their in-country exploration choices differ:

- **User A ("famous places")**: Île-de-France, Provence-Alpes-Côte d'Azur, Auvergne-Rhône-Alpes; California, Texas, Florida, New York.
- **User B ("off the beaten path")**: Corse, Guyane, Mayotte; Wyoming, Vermont, North Dakota, Alaska.

| | Old (current, live) | Redesign, weight=3 | **Redesign, weight=5 (final)** |
|---|---|---|---|
| User A | 296.8 | 138.8 | **211.3** |
| User B | 250.4 | 148.8 | **224.2** |
| Result | A wins by 46.4 | B wins by 10.0 | **B wins by 12.9** |

The ranking flip is the real deliverable: identical countries visited, but the traveler who went off-script now beats the one who hit the postcard spots — and the weight=5 tune also mostly repairs the ~50% magnitude collapse the first pass introduced, without giving up the behavioral flip.

---

## Overrides (outside the formula entirely)

### North Korea
`explorer_ceiling` forced to 0. `visit_base` still comes from the formula (danger correctly pushes it up), but there's no genuine tourist access or seed data for provinces/cities — the current dataset has **zero** North Korean cities, so its old explorer ceiling (~115–124 pts) was always unearnable fiction, not a real reward.

### Antarctica — needs special attention, not just a placeholder
This one is more than an edge case we noticed — it's a previously-shipped, deliberately-designed feature (see [antarctica.md](antarctica.md)) whose entire scoring rationale explicitly depends on size:

> "Antarctica's difficulty is real and it lives in two honest places the engine already rewards: distance and size ... squarely in 'big, far, bucket-list' territory." — antarctica.md

That doc's own numbers: Antarctica's old score leaned on a size contribution of **~8.3 points**, out of a total ~28–45 depending on home country. Removing size from base doesn't just create an edge case for Antarctica — it directly invalidates the reasoning the existing feature was built on, because Antarctica has no usable population/tourism data for the danger or tourism factors to compensate with either. Tested: Antarctica's new formula-driven total falls to **0.67**, a >98% collapse, worse than any other country in the dataset by a wide margin.

**Resolved: flat override, `AQ = 100`, the same for every user regardless of home country** — not just simpler, arguably more correct than the home-country-distance model every other country uses. Nearly all Antarctic tourism funnels through the same handful of expedition gateways (Ushuaia, Punta Arenas) regardless of where the traveler started, so "distance from home" isn't really tracking real difficulty here the way it does everywhere else — unlike every other country, where being closer genuinely does make the trip easier.

Anchored against the hardest *formula-driven* scores in the dataset at final settings (North Korea 111.1, Afghanistan 97.4) — 100 lands Antarctica just below North Korea rather than above it: extreme, but not declared the single hardest achievement in the entire game. That was a deliberate choice, not a default.

### Microstates
Unchanged — still a flat-points override table (VA=1, MC=2, SM=2, LI=2, AD=2, SG=3), unaffected by any of this.

---

## Q&A Log

Captured roughly in the order decisions were made, so future readers can see why, not just what (per the team's own doc-as-history convention).

**Round 1 — scope**
- Visa accessibility from home country: **scrapped**. Would require a home-country × destination data matrix (195×195), an architecture change nothing else in the app needs.
- Dynamic/live scoring: **scrapped for now**. Data refreshes periodically (same as today), but a country's score doesn't silently change under a user's already-logged visits.
- Danger should make a country worth *slightly* more, not dominate — confirmed via a deliberately smaller cap than tourism's.

**Round 2 — the coupling question**
- Should the explorer ceiling decouple from base entirely, so danger swings don't cascade into exploration reward? **No** — decided explicitly: "if a country is more dangerous to get to in the first place, visiting every province in it should still be more valued... slight swings with base is acceptable." This is why `explore_base` (not a fully independent ceiling formula) was the chosen shape — it keeps the coupling, just fixes what "coupled" means once size leaves the visible score.

**Round 3 — the floor**
- Initial ask was "implement a floor for all of Europe." Investigated and pushed back: the clustering-at-the-bottom problem wasn't actually Europe-specific — roughly half the affected countries were small Pacific/Caribbean islands (Palau, Seychelles, Barbados, Saint Lucia...). A region-locked floor would have fixed Malta while leaving Palau exactly as squashed.
- Real fix, confirmed with data: the floor was set too high for the formula's natural range, not filling a genuine gap in that range. Lowering it from 5 to 1 (applied at the total, not the base) took floor-dependent countries in Europe from a real problem to zero.

**Round 4 — the range**
- Separately flagged: North Korea's total already equals roughly 20+ small European countries summed together — confirmed this predates the redesign entirely (same ~22:1 ratio exists in the current live formula), so not something introduced this session.
- Decided to address it anyway, since the formula was already being changed: "3 points for France and 80-something for NK doesn't sit right." Landed on raising `TOURISM_WEIGHT` (5.0) rather than compressing the top, specifically because North Korea's tourism score is cap-saturated and therefore untouched by a weight change — the fix that raises the bottom without also raising the country it was being compared against.
- Checked the consequence at the full European scale before locking it in: average European total stayed at a sane ~26 points, range stayed real (2.8–199), no blanket inflation. Flagged as a real (accepted, not yet re-litigated) consequence: Belarus and Moldova now outscore Germany, France, and Spain, because they're both closer and genuinely less touristy — a legitimate outcome of "reward difficulty, not distance," but one worth a final gut-check before shipping.

---

## Open Questions

Constants that were tested with placeholders throughout this doc but not finally decided:

| Constant | Placeholder used | Status |
|---|---|---|
| `TOURISM_WEIGHT` | 5.0 | **Agreed** |
| `TOURISM_CAP` | 20.0 (unchanged) | **Agreed** |
| `FLOOR` (total-level) | 1.0 | **Agreed** |
| `DANGER_CAP` | 6.0 | Illustrative only |
| `FLOOR_POP` (province weighting) | 100,000 | Illustrative only |
| Antarctica override value | 100 | **Agreed** |
| Advisory data source(s) to blend | UK FCDO used in examples | Needs real sourcing/licensing decision |
| Full list of NK/Antarctica-style override countries | NK, Antarctica only, so far | Worth a deliberate pass (Turkmenistan? Eritrea?) rather than assuming it's just these two |
| Belarus/Moldova > Germany/France | Accepted provisionally | Confirm this reads as correct, not surprising, before shipping |

## Migration Concerns (not yet scoped)

Once the formula above is finalized, everything downstream that reads or thresholds a point total needs an audit before implementation: user totals, trophy unlock thresholds, style unlock thresholds, leaderboard ranking, and any cached/denormalized score. This is explicitly flagged as a separate pass, not assumed to be free — a full rebalance across those systems is comparable in scope to the formula work itself.
