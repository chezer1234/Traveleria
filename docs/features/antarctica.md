# Antarctica — the seventh landing

**Status:** implemented (issue #59)
**Branch:** `claude/antarctica-location-flag-0mtk0w`

## What

You can visit Antarctica in Traveleria and earn a fair number of points for it.
Until now the map bottomed out at the Southern Ocean — you could sail to the ice
but the app pretended you hadn't. Now `AQ` is a first-class destination: it shows
up in search, on the world map, and on the leaderboard, with a score breakdown
that explains itself like every other country.

## Why it matters

Setting foot on Antarctica is, for most people, the single hardest and most
memorable trip they'll ever take. Charlie's rule: if you got on a plane (or a
very cold boat), cleared the Drake Passage, and stood on the ice — that counts,
and it should count for a lot.

## The scoring problem

The points engine measures "how hard is it to visit?" as a **tourists-vs-residents
ratio**: few tourists relative to a large population = hard (North Korea, Pakistan).
Antarctica breaks that model because it has **no permanent population** — only
scientists. Published figures:

| Figure | Value | Source |
|--------|-------|--------|
| Over-winter residents | ~1,100 (up to ~5,000 in summer) | COMNAP station occupancy |
| Tourists per season | ~74,000 (2019–20) | IAATO tourism statistics |
| Area | 14,200,000 km² | CIA World Factbook |
| Reference point | South Pole (−90, 0) — Amundsen–Scott Station | geographic |

Run those through the tourism formula and you get ~0: there are *far* more
tourists than residents, so by that measure it looks "easy". That's the wrong
story, but the **fix is not to fake the data**. Antarctica's difficulty is real
and it lives in two honest places the engine already rewards:

1. **Distance** — the South Pole is the most remote point on Earth. From the UK
   it's ~15,700 km (distance multiplier ~5.1); even from its closest neighbour,
   South America, it's ~6,000 km.
2. **Size** — it's a whole continent (14.2M km², bigger than Europe). The size
   score alone is ~8.3.

So Antarctica scores **~28–45 base points** depending on where you call home —
squarely in "big, far, bucket-list" territory, and higher the further you travel
to reach it. Nothing hidden, nothing hard-coded into the number.

### The one override

We keep the *number* fully formula-driven, but the tourism **narrative** would
otherwise read "Very easy to visit — 67 tourists per resident", which is absurd.
So `getScoreBreakdown` special-cases `AQ` to explain the truth in plain English:
no permanent population, scored on size and remoteness. This is the only
Antarctica-specific branch in the engine, and it changes words, not points.

## The flag

Antarctica has no official flag (several unofficial ones exist — the "True South"
design, Graham Bartram's UN-style emblem). Rather than pick a political favourite,
we fly the continent's most famous resident: **🐧 a penguin**. It's honest (nobody
owns the ice), it's fun, and it's unmistakable. The emoji-flag helper — previously
copy-pasted into seven components — now lives in `client/src/lib/flag.js` with a
small override table, so the penguin shows up everywhere `AQ` appears.

## What we deliberately left out

- **No sub-region / continent trophies.** Antarctica has no `subregion`, so it's
  excluded from sub-region bonuses and the six-continent conquest trophies (those
  are built on the British-school continents). Visiting it *does* bump the Map
  page's "Continents" tally, which counts distinct `region` values.
- **No research stations as cities.** Kept the first cut focused on making the
  continent visitable and fairly scored. Stations-as-cities could be a fun
  follow-up (McMurdo, Amundsen–Scott, Palmer, Rothera…).

## Files touched

| File | Change |
|------|--------|
| `server/src/db/seeds/01_countries.cjs` | Add the `AQ` row; back-fill it into already-seeded databases |
| `server/src/lib/points.js` / `client/src/lib/points.js` | Antarctica tourism narrative in `getScoreBreakdown` (kept byte-identical) |
| `client/src/lib/flag.js` | New shared flag helper with the penguin override |
| `client/src/pages/*`, `client/src/components/QuickSearch.jsx` | Use the shared flag helper |
| `client/src/lib/geo.js` | Map topojson id `010` → `AQ` so the landmass is clickable |
| `server/__tests__/points.test.js`, `client/src/lib/__tests__/points.test.js` | Antarctica scoring + narrative tests |
| `server/__tests__/seeds.test.js` | Assert `AQ` is seeded |
