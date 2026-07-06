# TravelPoints — Design Concepts

Three complete visual directions for elevating TravelPoints, each illustrated with the same
three pages — the **World Map**, a **country page (Japan)**, and a **Territory Battle** — so
they can be compared apples-to-apples. All numbers are real output from the live scoring
engine (`server/src/lib/points.js`, home = UK), and all map geometry is the app's own
world-atlas TopoJSON plus `client/public/geo/JP.json`.

**Start here → [`index.html`](index.html)** (open it in a browser — every page is a single
self-contained HTML file with zero JavaScript).

| # | Concept | File | In one line |
|---|---------|------|-------------|
| 01 | **Atlas** | [`concept-1-atlas.html`](concept-1-atlas.html) | An heirloom expedition atlas — warm paper, engraved serifs, passport stamps, great-circle routes. |
| 02 | **Orbit** | [`concept-2-orbit.html`](concept-2-orbit.html) | Night-flight mission control — a glowing dot-matrix Earth, monospace telemetry, instrument-panel stats. |
| 03 | **Jetstream** | [`concept-3-jetstream.html`](concept-3-jetstream.html) | Bold travel-game energy — boarding-pass country pages, XP bars, battles as broadcast fixtures. |

## Viewing

- **Locally:** check out this branch and open `docs/designs/index.html` in a browser.
  No build step, no server needed.
- **From GitHub:** the files won't render as pages in the repo view; use the raw files in a
  browser, or the htmlpreview links in the PR description.

## How these were made

- Same mock traveller in every concept: 23 countries, 5 continents, 712.6 points, home = UK.
- Japan's page uses the real breakdown: base **53.2** (×4.4 distance · +6.94 tourism · +5.16 size),
  explorer ceiling **84.6**, max **137.8**, 8 of 47 prefectures visited.
- The three battle palettes (You / Opponent / Contested) were each validated for
  colour-vision-deficiency separation and contrast against their surface — including the
  app's current blue/red/purple, which passes as-is.
- Every multi-colour map carries a visible legend, and values are always printed as text,
  never encoded only in a hue.

Each concept document ends with implementation notes: Tailwind v4 `@theme` tokens for its
palette, the Google Fonts to load, and which existing components each mockup maps to
(`Map.jsx`, `CountryDetail.jsx` + `ScoreBreakdown.jsx`, `Territory.jsx`).
