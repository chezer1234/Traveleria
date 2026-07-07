# Trophy cabinet mode + sort

**Status:** In progress
**Issue:** [#57 — Small trophy changes](https://github.com/chezer1234/Traveleria/issues/57)
**Builds on:** [trophies-1-6.md](trophies-1-6.md) (the 46-trophy cabinet)

## What

Two small additions to the Trophies page, requested in #57:

1. **Cabinet mode** — a view toggle that switches from the full 46-trophy
   roster (ladders, conquests, specials, locked and unlocked together) to a
   display of *only the trophies you've actually unlocked* — the "trophies on
   the shelf" view, as opposed to the full catalogue with progress bars.
2. **A sort option** for that unlocked view, so a long cabinet is browsable
   once someone has 20+ trophies.

Everything here is client-side. No new data, no schema change, no backend —
`evaluateCabinet(stats)` already tags every trophy with `earned`, `earnedAt`,
and `medal` (tier); this is a display-only feature on top of what's already
computed.

## How it works

### View toggle

`Trophies.jsx` gets a `viewMode` state, `'all' | 'cabinet'`, defaulting to
`'all'` (today's behaviour, unchanged). A pill toggle — same pattern as the
"View mode" selector on the Map page (`Map.jsx`, Europe mode buttons) — sits
under the header:

- **Full Collection** — today's three sections (Expedition Ladders,
  Continental Conquests, Special Honours), locked trophies included with
  progress bars. No behaviour change.
- **My Cabinet** — a single flat grid of every earned trophy (ladder rungs,
  conquests, specials combined — `cabinet.all.filter(t => t.earned)`),
  rendered with the existing `TrophyCard`. Nothing locked is shown. An empty
  cabinet gets a short empty-state line instead of a blank grid.

### Sort

Only relevant in Cabinet mode — the Full Collection view keeps its fixed
ladder/tier ordering, which is structural (a ladder's rungs must stay
bronze→platinum). A `sortKey` state, `'recent' | 'oldest' | 'tier' | 'alpha'`,
picked via a second row of pill buttons that only render when `viewMode ===
'cabinet'`:

| Key | Order |
|---|---|
| `recent` (default) | Most recently earned first (`earnedAt` desc); undated trophies (conquests/specials with no natural date) last |
| `oldest` | First trophy ever earned first |
| `tier` | Platinum → bronze, ties broken alphabetically |
| `alpha` | A–Z by trophy name |

Implemented as `sortTrophies(trophies, sortKey)` in `lib/trophies.js`
(pure function, unit-tested alongside the existing evaluator tests) so the
sort logic isn't buried in the component.

## Open questions

- Should Cabinet mode persist across visits (localStorage) or always reset to
  Full Collection? Starting with reset-on-load (simplest); revisit if it's
  annoying in practice.
- Cabinet mode shows ladder rungs as individual cards (e.g. "Wayfarer" and
  "Voyager" as two separate cards if both countries-ladder tiers are earned)
  rather than collapsing a ladder into its highest earned rung. Keeping every
  earned trophy visible individually matches "trophies you have unlocked" in
  the issue text literally — a cabinet with 5 medals on a shelf, not 1.
