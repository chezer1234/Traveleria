# Navigation & Usability — audit and plan

**Status:** Proposal — audit complete, awaiting Q&A with Charlie before code
**Issue:** [#53 — Usability and Navigation Updates](https://github.com/chezer1234/Traveleria/issues/53)

## What

Issue #53 says it plainly: an app about going places is currently a bit hard
to get around. Long lists with no way to navigate them, very long pages that
stack several features on top of each other, and country names all over the
app that don't link anywhere. This doc is the full audit of every route and
page, the navigation hierarchy as it stands, and a concrete plan for the
links, components, and page structure that would make Traveleria a pleasure
to move through.

Guiding rule for everything below: **anywhere a country's name appears, it
should take you to that country. Anywhere a list is long, you should be able
to search it. Anywhere you drill in, you should be able to get back to where
you actually came from.**

---

## The map of the app as it is today

Twelve authenticated routes plus two sign-in routes, all behind a single
flat nav bar (`Layout.jsx`) with seven entries.

```
Nav bar:  Dashboard · Add Countries · Leaderboard · Map · Subregions · Trophies · Groups
          (+ Explorer Checklist overlay, logo → /dashboard)

/dashboard ──────────────► /countries/:code          (visited-country names link ✓)
             └────────────► /add-countries           (button ✓)
/add-countries ──────────► /dashboard                (only after submitting; rows don't link anywhere)
/countries/:code ────────► /state-battle/:uid/:cc    (Tier 0 battle picker ✓)
             └────────────► /dashboard               ("Back to Dashboard" — hardcoded)
/leaderboard ────────────► /territory/:userId        (⚔ Battle ✓)
             └────────────► /groups?add=<userId>     (✗ BROKEN — param is never read)
/territory/:userId ──────► /leaderboard              ("Back to Leaderboard" — hardcoded)
/state-battle/:uid/:cc ──► /countries/:code          (back link ✓)
/groups ─────────────────► /groups/:groupId          (✓)
/groups/:groupId ────────► /groups                   (back link ✓)
/map ────────────────────► /countries/:code          (click any country ✓, city pins ✓)
/subregions ─────────────► (nothing — no outbound links at all)
/trophies ───────────────► (nothing — no outbound links at all)
```

Observations about the shape:

- The hierarchy is honest — it's a hub-and-spoke app with the country page as
  the natural centre of gravity — but **half the spokes are one-way**. You can
  get *to* a country from the Map and Dashboard, but Subregions, Territory,
  Group Battle, and Add Countries all show country names that go nowhere.
- **Trophies and Subregions are dead ends.** You arrive, you look, and the
  only way onward is the nav bar.
- Battles (`/territory`, `/state-battle`, `/groups/:id`) are contextual pages
  reached from Leaderboard / CountryDetail / Groups — that's fine, they don't
  need nav entries — but their back links are hardcoded rather than aware of
  where you came from.

---

## Audit findings — the quirks

### A. Broken or misleading links

| # | Where | What happens |
|---|-------|--------------|
| A1 | `Leaderboard.jsx:107` — the "+Group" button | Links to `/groups?add=<userId>`, but `Groups.jsx` never reads the `add` query param (no `useSearchParams` anywhere in the file). The promise — "Add this traveller to a group" — silently dead-ends on the plain Groups page. |
| A2 | `CountryDetail.jsx:390` — "← Back to Dashboard" | Hardcoded. Arrive from the Map, Leaderboard battle, Add Countries, or a Subregion and the back link still says (and goes to) Dashboard. On the world's most travel-y app, the breadcrumbs point the wrong way home. |
| A3 | `CountryDetail.jsx:338` — country-not-found state | Renders an error box with **no navigation at all** — the back link is only rendered on the happy path. A bad code strands you. |
| A4 | `Layout.jsx:51` — the logo | Still reads "Travel**Points**" — the app was renamed Traveleria in #51 and the footer knows it, but the single most-clicked navigation element doesn't. |

### B. Country names that don't link (the "ironic" ones)

An app that scores you for visiting countries, where you mostly can't click a
country:

| # | Where | Detail |
|---|-------|--------|
| B1 | `Subregions.jsx` expanded card lists | Every country in every subregion is listed with flag and name — pure text. This is *the* page for planning "what's left in Southeast Asia?", and none of it is clickable. The world map at the top of the page has no click handler either (the main Map's does). |
| B2 | `AddCountries.jsx` rows | The row is a select-toggle only. There's no way to peek at a country ("what would Mongolia be worth? what provinces does it have?") before adding it. |
| B3 | `Territory.jsx` contested chips | Country names as inert pills. |
| B4 | `GroupBattle.jsx` contested chips | Same. |
| B5 | `StateBattle.jsx` contested state chips | Same (province-level — would link to the country page's province section). |
| B6 | `Leaderboard.jsx` user rows | Traveller names aren't clickable — the only way "into" another user is the small ⚔ icon. The natural gesture (tap the name) does nothing. |
| B7 | `Trophies.jsx` cards | "Asia Conquered 12/49" is a progress bar to nowhere. It should link to the thing you'd act on (the Map or the relevant continent's subregions). |
| B8 | `ChecklistOverlay.jsx` items | "Log a province" and "Log a city" have `link: null` — the two steps most in need of a pointer (they require finding a country detail page) are the two without one. |
| B9 | `Map.jsx` stat tiles | "Sub-regions: 14" sits two clicks of scrolling away from the Subregions page it summarises. Tiles aren't links. |

### C. Long lists with no ordering controls or search

Issue #53: "Lists should probably all be alphabetically ordered, maybe with
simple search."

| # | List | Current order | Search? | Notes |
|---|------|--------------|---------|-------|
| C1 | Dashboard visited countries | Visit date (`ORDER BY visited_at ASC` in `getUserCountriesLocal`) | ✗ | Fine at 8 countries, unusable at 80. No sort by name / points / region, no region grouping. |
| C2 | CountryDetail provinces | Population DESC (`queries.js:240`) | ✗ | USA = 50 states; finding "Wyoming" means scanning to the bottom. Alphabetical is how humans look up a known name. |
| C3 | CountryDetail cities | Population DESC | ✗ | Tier 0 countries carry 30+ cities. |
| C4 | CountryDetail experiences | Grouped by province, province order | ✗ | ~366 experiences across Tier 0 nations. |
| C5 | Add Countries | Alphabetical ✓ | ✓ | **The good example** — name/code/region search. This is the pattern to extract and reuse. |
| C6 | Subregions legend | 22 colour chips | — | Duplicates the card headers below it; pure noise between the map and the content. |
| C7 | Groups member picker | Leaderboard rank | ✗ | Fine now, degrades as user count grows. |

### D. Very long pages stacking multiple features

Issue #53: "maybe tabs or other navigation aids should be used."

| # | Page | What's stacked |
|---|------|----------------|
| D1 | **CountryDetail** (874 lines, the worst offender) | Header/stats → Score breakdown → Time log → Province map → Province list (50 rows) → Experiences (dozens) → Cities (30+). For the USA that's a *very* long scroll with no in-page navigation, no way to jump to Cities, and no indication the sections exist until you reach them. |
| D2 | **Subregions** | Stats bar → world map → 22-chip legend → 22 cards in 5 continent groups. No way to jump to a continent. |
| D3 | **Map** | Already solved its own version of this with the My Map / Europe / Explore view toggle — a good in-house precedent for tabs. |
| D4 | **Trophies** | Three sections (ladders / conquests / specials), long but coherent; low priority. |

### E. Missing global affordances

| # | Quirk |
|---|-------|
| E1 | **No scroll restoration.** No `ScrollToTop` / `ScrollRestoration` anywhere — click a country at the bottom of a long list and you land mid-scroll on the next page, headline out of view. Every long page makes this worse. |
| E2 | **No global country search.** The only search box in the app is inside Add Countries. "Take me to Japan" requires: Map → squint at East Asia → click; or Add Countries → search → *can't click through* (B2). A quick-jump search in the nav would collapse all of this. |
| E3 | **No breadcrumb / route context.** Detail pages (`/countries/:code`, battles) highlight nothing in the nav and carry no trail. |
| E4 | Unknown routes silently redirect to `/dashboard` — acceptable, but combined with A3 it means typos vanish rather than explain. |

---

## The plan

Three small shared components, one context rule, and a set of per-page
fixes. Nothing here changes scoring or data — it's all client-side glue.

### New shared components

**1. `<CountryLink code name />`** — the fix for the whole of section B.
Renders the country name (optionally flag) as a link to `/countries/:code`,
passing `state: { from: location }` so the detail page can offer a truthful
back link. One component, used by Dashboard, Subregions, Territory,
GroupBattle, AddCountries (as a small "view" affordance beside the select
row), and the Map tooltip-to-click path. The issue's phrase — "a name of a
country should link through to the most applicable page given the current
route context" — becomes: country names always link to the country page, and
the country page knows how to send you back.

**2. `<BackLink />`** — reads `location.state?.from` and falls back to a
sensible default per page (`/dashboard` for countries, `/leaderboard` for
territory, `/groups` for group battles). Kills A2/A3's hardcoding and makes
every drill-in reversible. Also rendered on the not-found state.

**3. `<ListControls />`** — the Add Countries search pattern (C5) extracted:
a search box plus a small sort toggle (A–Z / points / recent), controlled
props so each page keeps its own default. Applied to:
- Dashboard visited list (default: recent; sortable A–Z and by points)
- CountryDetail provinces and cities (default: **A–Z** — you look up a place
  you've been by its name, not its population; keep a "by points" sort for
  the optimisers)
- Groups member picker (search only)

Plus one behaviour: **`<ScrollToTop />`** on route change (E1) — three lines,
app-wide relief.

### Per-page fixes

**CountryDetail (D1)** — add a sticky in-page section nav under the header:
`Score · Time · Provinces (12/50) · Experiences (3/38) · Cities (5/32)`,
anchor-scrolling to each section, with counts so the page's contents are
visible from the top. Tabs were considered instead; anchors win because the
sections genuinely relate (ticking a province updates the score header) and
anchor navs keep the one-page-per-country mental model. If Charlie prefers
real tabs after using it, the section markup doesn't change — only the
container. Provinces and cities get `<ListControls />` and alphabetical
default (C2/C3).

**Leaderboard** — make the traveller's name link to `/territory/:userId`
(B6, same destination as ⚔, now on the natural click target), and fix
"+Group" (A1) by making Groups actually read `?add=`: open the create form
with that user pre-selected (or, later, an "add to existing group" sheet —
open question 3).

**Subregions (B1, C6, D2)** — country names in expanded cards become
`<CountryLink>`s; the top map gets the same click-through the main Map has;
the 22-chip legend is dropped (the cards *are* the legend); a compact
continent jump-row (`Europe · Asia · Africa · Americas · Oceania`) anchors
down the page.

**Trophies (B7)** — conquest cards link to the Map (Explore view), ladder
"next rung" rows link to the page where progress happens (countries ladder →
Add Countries, subregions ladder → Subregions, etc.). One line per card.

**Map (B9)** — stat tiles become links: Sub-regions → `/subregions`,
Countries → `/dashboard`, Trophies-adjacent counts later. The Map is already
the app's best-navigated page; this just closes its loops.

**Checklist (B8)** — "Log a province"/"Log a city" link to the user's most
recently visited country's detail page (or Add Countries when they have
none).

**Layout (A4)** — logo says Traveleria.

**Battles (B3–B5)** — contested chips become `<CountryLink>`s (state chips
link to `/countries/:code`).

### Explicitly not in scope (yet)

- **Global quick-jump search in the nav (E2).** Genuinely wanted, but it's a
  feature with its own design questions (keyboard shortcut? results ranking?
  mobile treatment?) — better as a fast follow than a rider on this cleanup.
  Listed as open question 1.
- Restructuring the nav bar into grouped menus. Seven items still fits; the
  fixes above reduce the pressure on the nav because pages start linking to
  each other.
- Server/API changes. None needed — every fix is in the client.

### Suggested phasing

1. **Phase 1 — links everywhere** (`CountryLink`, `BackLink`, Leaderboard
   names, Subregions/battle/trophy links, checklist links, `?add=` fix, logo,
   ScrollToTop). Small diffs, each independently shippable, kills every quirk
   in sections A, B, E1.
2. **Phase 2 — list controls** (`ListControls` on Dashboard + CountryDetail +
   Groups picker; alphabetical defaults). Section C.
3. **Phase 3 — long-page structure** (CountryDetail section nav, Subregions
   continent jumps + legend removal). Section D.

Each phase ends with the Chrome walk-through per the house workflow.

---

## Open questions for Charlie

1. **Global country search** — do you want a search box in the nav bar (type
   "Jap…", hit enter, land on Japan) as part of this, or as its own follow-up
   feature? It's the single biggest "pleasure to use" win but the biggest
   single piece of work here.
2. **CountryDetail: anchors or tabs?** The plan says a sticky anchor nav
   (everything stays on one page, you can still scroll straight through).
   Real tabs would make the page feel shorter but hide the sections. Which
   feels right for the USA page?
3. **"+Group" from the leaderboard** — when you tap it on a traveller, should
   it (a) open the *new group* form with them pre-selected (cheap, planned),
   or (b) offer to add them to one of your *existing* groups (better, needs a
   small member-add mutation that doesn't exist yet)?
4. **Dashboard default sort** — keep "order I visited them" as the default
   (it tells the story of your travels) with A–Z/points a tap away, or flip
   the default to A–Z per the issue?
5. **Province order sanity check** — provinces are currently listed biggest
   population first. The plan flips to A–Z. Does losing the "biggest states
   first" feel wrong anywhere (e.g. does it bury the states most people
   visit)?
