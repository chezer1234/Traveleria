# Tabs and sub-tabs — bottom navigation

**Status:** Implemented
**Issue:** [#65 — Tabs and sub tabs](https://github.com/chezer1234/Traveleria/issues/65)

## What

Replace the flat seven-link top nav (and its hamburger menu on narrow screens)
with a mobile-app-style bottom tab bar: three main tabs, each grouping two or
three related pages as sub-tabs.

- **Comparison** — Leaderboard (default), Groups
- **Points** — Add Countries (default), Subregions
- **Overview** — Dashboard (default), Trophies, Map

Tapping a bottom tab always lands you on that group's default sub-tab.
Landing on a sub-tab shows a strip of icon+label pills for its siblings, so
you can move sideways (Leaderboard → Groups) without dropping back to the
bottom bar first.

## How

Three new pieces, no server changes:

- **`client/src/lib/navGroups.js`** — the single source of truth. Each group
  has an id, label, icon, and an ordered list of sub-tabs (`subTabs[0]` is
  the landing page). A group's icon is always the same component as its
  default sub-tab's icon, so the shape you tap on the bottom bar is the shape
  you land on. `getActiveGroup(pathname)` maps the current route to a group,
  including drill-in routes that aren't sub-tabs themselves (`/territory`,
  `/state-battle`, `/countries/:code`, `/groups/:id`) so the bar still
  highlights something sensible when you're a level deep.
- **`client/src/components/icons/NavIcons.jsx`** — the SVG icon set, kept in
  its own file (react-refresh requires files to export components only, and
  `navGroups.js` needed to stay a plain data module).
- **`client/src/components/BottomTabBar.jsx`** — fixed to the bottom of the
  screen for every authenticated route. Three buttons, each navigating to its
  group's default sub-tab on tap, active tab tinted in the theme's compass
  colour.
- **`client/src/components/SubTabStrip.jsx`** — renders directly under the
  top bar, only on pages that are themselves a sub-tab (not on drill-ins),
  and only when the group has more than one sub-tab. This is the "apparent
  icon" the issue asked for — the way from Leaderboard to Groups and back.

`Layout.jsx` lost the hamburger button, the `menuOpen` state, and the mobile
dropdown menu entirely — the top bar is now just the checklist button, logo,
search, style switcher, and account controls, all always visible instead of
being gated behind `xl:` breakpoints. A spacer div (matching the tab bar's
height plus `env(safe-area-inset-bottom)`) sits above `<BottomTabBar />` so
the footer and end of long pages never get covered by the fixed bar.

## Decisions

The issue didn't say where **Map** goes — it's not part of any of the three
listed groups. Charlie's call: Map joins **Overview**, alongside Dashboard
and Trophies (issue #65 Q&A). Overview's sub-tabs are Dashboard, Trophies,
Map in that order.

Drill-in pages (Country Detail, Territory, Group Battle, State Battle) keep
their existing back-link behaviour unchanged ("as it works now" — Charlie).
The bottom bar still renders on these pages and highlights a parent group via
a static route-prefix map rather than full breadcrumb tracking — Country
Detail highlights Overview (the common path is Dashboard → country), Groups
battle and Territory highlight Comparison, State Battle highlights Points.

The bottom bar renders at every breakpoint, not just mobile — with the old
top nav's seven links gone, there was nothing left to duplicate on desktop,
so one navigation paradigm covers both.

## Open questions

None outstanding — Map placement and drill-in-page behaviour were confirmed
with Charlie before implementation.
