# Traveleria — Logo & App Icon Concepts

Ten candidate marks to replace the stock Vite favicon (`client/public/vite.svg`) and give
Traveleria a real identity. **Start here → [`logos.html`](logos.html)** (open it in a browser —
it shows every mark at home-screen size, at 48/32/16 px on light *and* dark tab strips, and in a
lockup next to the wordmark).

## The brief

The logo should promote the fun, not just decorate it. Every concept is built from a feature
that actually shipped, and each is a single hand-authored SVG on a 512×512 grid with the same
rounded-square footprint — so the winner drops straight in as the favicon, the PWA/app icon,
and the mark beside the wordmark with no rework.

Colours come from the app's own theme swatches (`client/src/themes/*/index.jsx`):
Atlas paper/green/gold, Orbit navy/cyan/pink, Jetstream cream/teal/amber.

## The ten

| # | File | Concept | Feature it promotes |
|---|------|---------|---------------------|
| 01 | [`01-passport-stamp.svg`](01-passport-stamp.svg) | Tilted rubber entry stamp, TRAVELERIA · 195 NATIONS ring | Passport stamps (Atlas) |
| 02 | [`02-territory-battle.svg`](02-territory-battle.svg) | World split by a jagged front line + tug-of-war bar | Territory battles |
| 03 | [`03-trophy-globe.svg`](03-trophy-globe.svg) | Gold cup whose bowl is the globe | The 46-trophy cabinet |
| 04 | [`04-boarding-pass.svg`](04-boarding-pass.svg) | Tear-off ticket with big T, perforation, barcode | Boarding-pass pages (Jetstream) |
| 05 | [`05-great-circle.svg`](05-great-circle.svg) | Route arcs from home pin to a points burst | Distance scoring |
| 06 | [`06-dot-matrix-earth.svg`](06-dot-matrix-earth.svg) | Glowing dot-grid globe, pink next-target dot | World map (Orbit), dark-native |
| 07 | [`07-compass-rose.svg`](07-compass-rose.svg) | Engraved 8-point rose, gold north needle | The expedition atlas |
| 08 | [`08-pin-planet.svg`](08-pin-planet.svg) | Map pin whose head is the world, gold field | Logging where you've been |
| 09 | [`09-xp-badge.svg`](09-xp-badge.svg) | Hex achievement badge, points burst, rank chevron | Points, tiers, unlockable styles |
| 10 | [`10-paper-plane-orbit.svg`](10-paper-plane-orbit.svg) | Paper plane lapping a little world | The joy of going places |

## How to choose (Charlie)

1. Squint at the 16 px row in `logos.html` — that's the browser tab. If you can't tell it's
   Traveleria at 16 px, it loses.
2. Look at the big tile — that's the phone home screen. Does it make you want to tap it?
3. Comment on the PR with the winning number — or a top three plus what you'd change
   (colours, tilt, details are all easy to iterate).

## Rollout plan once a mark is picked

1. `client/public/favicon.svg` (new file) + swap the `<link rel="icon">` in `client/index.html`.
2. PWA/app icon: same SVG, plus PNG renders if/when a manifest lands.
3. Optionally weave the mark into the per-theme `Logo` slots (`client/src/themes/*/index.jsx`)
   next to the wordmark.
4. Update docs headers / README where the identity shows up.

## Status

**Proposal — awaiting Charlie's pick.** (July 2026)
