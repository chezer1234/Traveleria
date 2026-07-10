# User-Selectable Styles (issue #60)

**Status:** Implemented — verified in Chromium across all three styles (dashboard, map, country, trophies, subregions, sign-in)
**Branch:** `claude/user-selectable-styles-n5bro5`
**Design source:** [`docs/designs/`](../designs/README.md) — the three concept directions

## What

Charlie picked **Atlas** as the app's design system (6 July 2026), but all three
concept directions — **Atlas**, **Orbit**, and **Jetstream** — are complete, validated
designs. This feature makes the style a user choice:

- **Atlas** (default) — heirloom expedition atlas. Warm paper, Fraunces serifs,
  double-rule plates, passport stamps. Light.
- **Orbit** — night-flight mission control. Deep-space navy, Space Grotesk +
  JetBrains Mono telemetry, signal-cyan glow. Dark.
- **Jetstream** — bold travel-game energy. Warm white cards, Nunito 900, rounded
  pills, coral→violet jet-trail gradient. Light.

Every feature (map, country pages, battles, trophies, groups, leaderboard) works in
all three styles, and each style keeps its own distinct look and feel — not just a
palette swap: fonts, corner radii, borders, shadows, and signature details
(grain + stamps / HUD glow / sticker badges) all follow the style.

The choice is saved as a user preference: instantly on the device, and on the
account when signed in, so it follows you across devices.

## How

### 1. Semantic tokens + `data-theme` (Tailwind v4 CSS-first)

The app already routes ~all colour through the Tailwind v4 `@theme` tokens from the
Atlas refresh (`--color-paper`, `--color-ink`, `--color-compass`, …) and components
use them semantically (`bg-panel`, `text-ink-soft`, `border-hairline`). So theming is
done the canonical Tailwind v4 way:

- `@theme` in `index.css` keeps defining the tokens (Atlas values = defaults), so
  utilities like `bg-paper` exist exactly as today.
- `[data-theme="orbit"]` / `[data-theme="jetstream"]` blocks in `@layer base`
  re-map the same variables — e.g. Orbit sets `--color-paper: #070d18` (deep space),
  `--color-compass: #38e1ff` (signal cyan).
- The active theme is a `data-theme` attribute on `<html>`. No attribute = Atlas.

Token re-mapping per theme (values from the concept docs' implementation notes):

| Token | Meaning | Atlas | Orbit | Jetstream |
|---|---|---|---|---|
| `paper` | page background | `#f6f1e7` | `#070d18` | `#fdfbf7` |
| `panel` | cards / nav | `#fbf8f1` | `#0d1626` | `#ffffff` |
| `ink` | primary text | `#26221b` | `#e8eef7` | `#1f2430` |
| `ink-soft` | secondary text | `#6b6355` | `#8fa3c0` | `#5b6472` |
| `hairline` | borders | `#d8cfba` | `#1e2f4a` | `#e3e0d6` |
| `parchment` | muted fill / unvisited | `#e4dccb` | `#22314d` | `#e7e4dc` |
| `atlas` | visited / success | `#3e5f45` | `#2bb3e0` | `#0f9d8f` |
| `compass` | primary action / links | `#2e5fa3` | `#38e1ff` | `#3b82f6` |
| `sienna` | opponent / destructive accent | `#b4552d` | `#d84a86` | `#ef4444` |
| `plum` | contested | `#7b4a8f` | `#a3812c` | `#a855f7` |
| `gold` | decorative accent / badges | `#c9a227` | `#e9c46a` | `#f59e0b` |

New semantic tokens added for the battle palettes (previously hardcoded hex in
`Territory.jsx` / `StateBattle.jsx` / `GroupBattle.jsx`): `--color-you`,
`--color-them`, `--color-contested`. Each theme maps them to its validated battle
palette (they were CVD-checked per concept — see designs README).

Fonts and shape are tokens too: `--font-display` / `--font-sans` swap per theme
(Fraunces+Inter / Space Grotesk / Nunito), and the Tailwind radius scale
(`--radius-md` etc.) is nudged up for Orbit and further for Jetstream so existing
`rounded-*` utilities produce each style's corner language without touching JSX.

Signature elements are theme-scoped component classes: `.plate` (Atlas double-rule →
Orbit HUD panel → Jetstream soft-shadow card), `.stamp` (rotated passport stamp →
mono telemetry chip → sticker badge), `.smallcaps` (Inter tracking → JetBrains Mono
microlabel → Nunito 800), plus the Atlas paper-grain body texture (Atlas only) and
`color-scheme: dark` for Orbit.

### 2. Theme-aware map/SVG colours

Inline SVG (react-simple-maps, province maps, battle maps) previously hardcoded the
Atlas hexes. Those become `var(--color-…)` references (and `color-mix(…)` for hover
tints), which resolve live against the active theme — no JS colour tables to keep in
sync.

**Deliberately constant across themes:**
- The 22 subregion categorical colours (`Subregions.jsx`) — they're data colours,
  chosen for mutual distinguishability, not brand.
- Trophy metal palettes (`trophyArt.js`) — bronze/silver/gold/etc. are the
  achievement identity.
- Group member colours — user-chosen per group.
Their *surroundings* (strokes, unmapped fills, locked-trophy paper) do follow the
theme so nothing looks pasted-on in Orbit's dark UI.

### 3. Persistence

- **Device:** `localStorage` key `traveleria.style`, applied by a tiny inline script
  in `index.html` *before* first paint (no theme flash), and owned at runtime by a
  new `ThemeContext` (`ThemeProvider` sets `data-theme` on `<html>`).
- **Account:** new nullable `style` column on `users` (non-destructive migration,
  values `atlas | orbit | jetstream`), returned by `/auth/me`, `/auth/signin`,
  `/auth/signup`, `GET /users/:id`; updated via `PUT /api/users/:id/style`
  (requireAuth + requireOwnership + zod enum).
- **Sync rule:** the server value wins on sign-in (it's the cross-device
  preference); changing style while signed in writes localStorage immediately and
  fires the API update in the background. Signed-out visitors can still switch —
  device-only.
- The style is *not* part of the local-DB change feed: it isn't travel data, other
  users never need it, and keeping it out avoids a client schema-version bump.

### 4. Switcher UI

A style picker lives in the nav (desktop: compact dropdown next to the user
section; mobile: options in the slide-down menu). Each option shows a three-dot
palette swatch + name so you can see what you're picking. Also shown on the
sign-in/sign-up pages footer, since the preference works signed-out.

## Open questions (answered)

- **Should Atlas stay the default?** Yes — it's Charlie's chosen direction; the
  other two are opt-in.
- **Do trophies re-skin?** Cabinet chrome and locked states follow the theme;
  medal artwork/metals stay constant (they're the achievement identity).
- **Per-theme meta `theme-color`?** Yes — ThemeContext updates the browser UI
  colour to match the page background.
- **Does dark Orbit need contrast re-checks?** The Orbit palette in the concept doc
  was validated against its dark surfaces; battle palettes were CVD-checked per
  concept. Anything not covered by tokens (e.g. red error text on stock Tailwind
  classes) gets a theme-scoped override where illegible.
