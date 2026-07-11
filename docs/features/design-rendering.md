# Design Rendering — finishing the concept designs (issue #63)

**Status:** Phase 1 implemented — registry + the five #63 call-outs, verified in
Chromium across all three styles (country pages, world map, leaderboard,
sign-in). The ⬜ items in the tables below are the remaining systematic worklist.
**Branch:** `claude/design-rendering-iwmzwx`
**Design sources:** [`docs/designs/`](../designs/README.md) — `concept-1-atlas.html`,
`concept-2-orbit.html`, `concept-3-jetstream.html`, `direction-final.html`

## What

Issue #60 shipped the *token layer* of the three design directions: colours, fonts,
radii, `.plate` / `.stamp` / `.smallcaps`, and the paper grain. But the concept
mockups contain a lot of signature visual craft that never made it into the app —
the parts that make each style feel designed rather than re-coloured.

This feature does three things:

1. **Inventories every novel design element** in the mockups that isn't implemented
   (the tables below — the systematic worklist the issue asks for).
2. **Implements the headline items**, including the issue #63 call-outs:
   theme-aware logo, themed leaderboard, Atlas ticket header + ~20 passport stamp
   designs, Orbit dot-matrix maps, Jetstream boarding pass with barcode.
3. **Makes the design system truly pluggable** — a theme registry where each style
   is a self-contained definition (tokens + chrome + component slots), ready for
   unlockable designs at future milestones.

## The gap inventory

Legend: ✅ = implemented in this feature · ⬜ = backlog (listed so we can work
through systematically) · line references are into the concept HTML files.

### Both/all themes

| # | Element | Where in mockup | App target | Status |
|---|---------|-----------------|------------|--------|
| G1 | Theme-aware wordmark/logo (top-left, every page) | all three navs | `Layout.jsx`, `SignIn.jsx`, `SignUp.jsx` | ✅ |
| G2 | Themed leaderboard | *no mockup page exists* — derived from each theme's vocabulary | `Leaderboard.jsx` | ✅ |
| G3 | Home-base marker on world map (Atlas gold star ✦ / Orbit crosshair reticle / Jetstream ink star) | atlas 658–665, orbit 2247–2265, jetstream `.home-star` | `Map.jsx` | ⬜ |
| G4 | Great-circle route arcs home → visited (Atlas dashed blue / Orbit cyan 30% / Jetstream ink dashes) | atlas 652–657, orbit 617–622, jetstream `.route` | `Map.jsx` | ⬜ |
| G5 | Graticule behind world map | atlas `.grat` ink 12%, orbit 20° `#233657`, jetstream ink 5% | `Map.jsx`, `Territory.jsx` | ✅ Orbit (part of dot map) · ⬜ Atlas/Jetstream |
| G6 | Rich pinned "adventure bait" tooltip (base + worth-up-to pts) | atlas 691–694, orbit 2267–2275, jetstream `.tip` | `Map.jsx` | ⬜ |
| G7 | Themed segmented view toggles (Atlas squared book tabs / Orbit mono cyan / Jetstream pills) | atlas 132–139, orbit 186–194, jetstream `.toggle` | `Map.jsx`, `Territory.jsx`, `CountryDetail.jsx` | ⬜ |
| G8 | Map legend upgrades (route dash key, home star key, provenance caption) | atlas 697–702, orbit 262–270, jetstream `.lg` | `Map.jsx`, `Territory.jsx` | ⬜ |

### Atlas (heirloom expedition atlas)

| # | Element | Where in mockup | App target | Status |
|---|---------|-----------------|------------|--------|
| A1 | **Ticket-style country header** — old expedition ticket with perforated stub, punch holes, serial number | issue #63 call-out (extends the mockup's plate language) | `CountryDetail.jsx` | ✅ |
| A2 | **Passport stamp set** — ~20 distinctive stamp designs (shapes × inks), deterministic per country, arced textPath | concept 756–773 (one circular design); #63 asks for ~20 varied | `CountryDetail.jsx` via theme slot | ✅ |
| A3 | Hand-drawn 8-point compass rose on map plates | 666–688, 885–906 | `Map.jsx`, `Territory.jsx` | ⬜ |
| A4 | "N / 195 logged" rotated rubber stamp on map plate | 216–225, 695 | `Map.jsx` | ⬜ |
| A5 | Parchment framed tooltip with caret + hard offset shadow | 184–196 | `Map.jsx`, `Territory.jsx` | ⬜ |
| A6 | Engraved country fills (darker matching strokes, fill-opacity hover) | 167–174 | `Map.jsx` | ⬜ |
| A7 | Prefecture ledger (ruled Name/Pop/Points table beside numbered map plate) | 830–935 | `CountryDetail.jsx` provinces tab | ⬜ |
| A8 | City chips (✓ + pts bordered chips instead of checkbox rows) | 301–310, 923–932 | `CountryDetail.jsx` cities tab | ⬜ |
| A9 | Rope + brass-knot tassel tug-of-war centre marker | 1002–1012 | `Territory.jsx` | ⬜ |
| A10 | Plum wax-seal markers on contested countries | 1211–1212 | `Territory.jsx` | ⬜ |
| A11 | Italic Fraunces reassurance line | 315–317 | `Territory.jsx` | ⬜ |
| A12 | Ledger stat rows bounded by ink rules (vs rounded cards) | 141–153 | `Map.jsx`, `Dashboard.jsx` | ⬜ |
| A13 | Bordered uppercase username chip in nav | 116–130 | `Layout.jsx` | ⬜ |
| A14 | Ink-filled square tier pill | 232–237 | `CountryDetail.jsx` | ⬜ |

### Orbit (night-flight mission control)

| # | Element | Where in mockup | App target | Status |
|---|---------|-----------------|------------|--------|
| O1 | **Dot-matrix Earth** — land as glowing dot grid (uniform pitch, point-in-polygon sampled), visited dots glow | 615–2266, 2621–4247, CSS 220–230 | `Map.jsx`, `Territory.jsx` | ✅ |
| O2 | 20° graticule behind the dots | 616, 2622 | `Map.jsx`, `Territory.jsx` | ✅ (part of O1) |
| O3 | Orb wordmark (radial-gradient planet + tilted orbit ring) | 160–169 | `Layout.jsx` | ✅ (G1) |
| O4 | Mono user chip with pulsing signal dot | 173–179 | `Layout.jsx` | ⬜ |
| O5 | Status line telemetry banner (home coords, sector/tier crumb) | 572–578, 2325–2328 | `Map.jsx`, `CountryDetail.jsx` | ⬜ |
| O6 | Instrument stat tiles with 6px bars + glowing cyan hero | 196–213 | `Map.jsx`, `Dashboard.jsx` | ⬜ |
| O7 | Readout tiles with formula sub-labels + glowing "your score" | 294–301, 2337–2358 | `CountryDetail.jsx` | ⬜ |
| O8 | FLIGHT COMPUTER formula strip + mono data chips in breakdown | 312–342 | `ScoreBreakdown.jsx` | ⬜ |
| O9 | Prefecture lit-glow fills + `SOURCE: geo/XX.json` caption | 344–350, 2447–2500 | `ProvinceMap.jsx` | ⬜ |
| O10 | Prefecture telemetry list + "next best target" recommender | 356–388, 2503–2529 | `CountryDetail.jsx` | ⬜ |
| O11 | Signal-strength tug bar (glowing balance marker, 50% hairline label, SIGNAL A/B ticks) | 397–426 | `Territory.jsx` | ⬜ |
| O12 | Contested chips with blinking terminal cursor ▌ | 428–445, 4258–4264 | `Territory.jsx` | ⬜ |
| O13 | Home crosshair + amber target-lock reticle | 2247–2265 | `Map.jsx` | ⬜ |
| O14 | Motion: cursor blink, signal-dot pulse, mount scan sweep (mockup implies, ships none) | design note 4274 | `index.css` | ⬜ |

### Jetstream (bold travel-game energy)

| # | Element | Where in mockup | App target | Status |
|---|---------|-----------------|------------|--------|
| J1 | **Boarding-pass country header** — main panel + perforated tear-off stub, punched notches, barcode, gate/seat flavour row | 208–250, 740–792 | `CountryDetail.jsx` | ✅ |
| J2 | Jet-trail gradient tokens (`--coral #ff6b4a`, `--violet #7c5cff`, `--grad`) | 13–17 | `index.css` jetstream block | ✅ |
| J3 | Wordmark with rounded gradient underline | 112–129 | `Layout.jsx` | ✅ (G1) |
| J4 | Gradient circular user avatar chip | 124–129 | `Layout.jsx` | ⬜ |
| J5 | XP bars with milestone ticks + riding progress pill | 152–156, 273–280 | `ScoreBreakdown.jsx`, `Dashboard.jsx` | ⬜ |
| J6 | Stat tiles with gradient hero tile + "pts to next badge" chase | 143–156 | `Dashboard.jsx`, `Map.jsx` | ⬜ |
| J7 | Q&A icon coins (pastel circles) + gradient math strip | 252–272 | `ScoreBreakdown.jsx` | ⬜ |
| J8 | Sticker achievement badges (amber border, dashed locked) | 198–206 | `Trophies.jsx`, `Dashboard.jsx` | ⬜ |
| J9 | City chips (teal ✓ chips, dashed unvisited) | 282–306 | `CountryDetail.jsx` | ⬜ |
| J10 | Broadcast fixture battle (VS lockup, ringed avatars, possession bar, overtime chips) | 308–352 | `Territory.jsx`, `StateBattle.jsx`, `GroupBattle.jsx` | ⬜ |
| J11 | Legend sticker chips | 187–196 | `Map.jsx`, `Territory.jsx` | ⬜ |

## The pluggable architecture

Issue #60's token layer already gives us the right substrate: everything colour,
font, and radius flows through CSS custom properties re-mapped per
`data-theme`. What was *not* pluggable was everything else — the theme list,
page colours, and any component whose *structure* differs per theme (logo,
stamps, map rendering, header layout) was hardcoded or impossible.

### Theme registry — `client/src/themes/`

Each theme is now a self-contained definition module:

```
client/src/themes/
  registry.js         ← THEMES list; the ONLY place a theme is registered
  atlas/index.jsx     ← definition: metadata + component slots
  atlas/PassportStamp.jsx
  orbit/index.jsx
  jetstream/index.jsx
  shared components (Logo variants, CountryStub variants, …)
```

A definition looks like:

```js
{
  id: 'atlas',
  name: 'Atlas',
  tagline: 'Heirloom expedition atlas',
  swatch: ['#f6f1e7', '#3e5f45', '#c9a227'],
  pageColor: '#f6f1e7',          // <meta name="theme-color">
  Logo,                          // wordmark component (nav + auth pages)
  VisitedStamp,                  // per-country visited mark (Atlas: passport stamps)
  CountryStub,                   // right-hand panel of the country header (or null)
  map: { dots: false },          // world-map render mode (Orbit: dot matrix)
  unlock: null,                  // future: milestone criteria for unlockable themes
}
```

Rules of the system:

- **Tokens stay in CSS** (`index.css` per-`data-theme` blocks) — that part was
  already right. Chrome classes (`.plate`, `.stamp`, `.country-header`, `.lb-*`)
  are theme-scoped CSS keyed off `data-theme`.
- **Structure lives in slots.** Components never branch on `theme.id`; they render
  `theme.Logo`, `theme.VisitedStamp`, `theme.CountryStub`, and consult
  `theme.map.dots`. A new theme plugs in by providing its own slot components (or
  reusing another theme's).
- **`ThemeContext` consumes the registry** — it no longer owns a hardcoded theme
  list, and exposes the full active definition as `themeDef`.
- **Adding a theme** = add `client/src/themes/<id>/`, register it in
  `registry.js`, add a `:root[data-theme="<id>"]` token block, and add the id to
  the server's `STYLE_IDS` (`server/src/lib/schemas.js`) so the account
  preference round-trips. The pre-paint script in `index.html` reads the id from
  localStorage generically.
- **Unlockables (future):** the `unlock` field is reserved for milestone criteria
  (e.g. `{ trophies: 10 }` or `{ countries: 25 }`). The switcher will render
  locked themes greyed with their unlock condition; the server enum stays the
  gatekeeper for persisting a locked choice. Nothing else needs to change.

### Determinism — stamps and barcodes

Charlie's requirement: every country should look a bit different, but the *same*
country must always get the *same* stamp. Both the Atlas stamp variant and the
Jetstream barcode derive from a small hash of the ISO country code
(`client/src/lib/themeArt.js`, unit-tested): 20 stamp designs = 10 shapes × ink
rotation through 6 authentic stamp-pad colours, plus deterministic rotation
jitter; barcodes are per-country bar sequences. No randomness at render time.

### Orbit dot-matrix maps — how

`DotMatrixLayer` renders inside the existing `ComposableMap`: it samples a
uniform grid in projected screen space (pitch ≈ 9px, dot r ≈ 0.35 × pitch,
mirroring the mockup's 9-unit grid / r=3.1), keeps grid points that fall inside a
country polygon (`d3-geo` `geoContains` limited to each feature's projected
bounding box, memoised), and colours each dot by the owning country's
visited/ownership state — visited dots get the cyan glow. The graticule renders
behind at 20° steps. The original `<Geography>` paths stay mounted with
transparent fills on top, so hover, click, and zoom behave identically to the
other themes. Sub-national maps stay solid-fill polygons, exactly as the mockup
specifies ("world = dots, sub-national = lit polygons").

## Open questions

- **Atlas map furniture (compass rose, routes, home star)** — highest-impact
  backlog items; they need a capital-coordinates lookup on the client. Worth its
  own pass with Charlie reviewing the plate composition.
- **Leaderboard designs are extrapolations** — no mockup exists, so the themed
  treatments here follow each theme's established vocabulary. Charlie should
  vet them like a fourth mockup page.
- **Score-so-far on the country header** — the Jetstream stub shows "score so
  far"; we surface the same numbers the page already shows (base, max,
  % explored) rather than inventing a new client-side total that could drift
  from the engine. If we want a true earned total on the header, expose it from
  the scoring queries first.
