# Experiences tab: US & China section

**Status:** Implemented (awaiting review)

## What

Finishes the global Experiences tab (issue #74) by bringing the Tier 0
state/province experiences for the **United States** and **China** onto it.
Until now they only lived inside each country's own detail page (plus the
handful of UNESCO/Seven Wonders rows in the "All Experiences" table).

## How it looks

A new section at the **bottom** of the Experiences tab, two columns side by side
(stacked on phones):

| Left | Right |
|------|-------|
| United States | China |

Each column has:

1. **The country's name**, then **its outline** drawn in black (the theme's ink
   colour, so it stays visible in dark mode).
   - **Hover:** the outline lifts up slightly and turns purple (the same
     `--color-wonder` purple used for the Seven Wonders).
   - **Click:** goes to that country's page.
2. **The experience list**, exactly like the country page's Experiences tab:
   grouped by state/province, a checkbox per experience, "x/y logged · n pts
   each" per state, Great Wall in Seven Wonders purple.
   - The list sits in a **fixed-height box that scrolls on its own**, so the
     section takes up a set slice of the page rather than hundreds of rows.
   - A search box filters by experience or state name.
   - Checkboxes are disabled until you've logged that country (same rule as
     the country page), with a note saying so.

## Navigation

The Experiences tab moves from the **Overview** group to the **Points** group
(Add Countries · Subregions · Experiences), since logging experiences is a way
of earning points. This also fixed a bug: `GROUP_PREFIXES` in `navGroups.js`
had `overview` defined twice, so `/experiences` didn't highlight any group in
the bottom bar.

## Data

No new data or schema. Reuses `getCountryLocal` (provinces + experiences),
`getUserStatusForCountry` (visited / logged state), `getUserCountryScoreLocal`
(pts each) and the existing `add/removeProvinceExperienceOptimistic`
mutations — so ticking something here is identical to ticking it on the
country page, including auto-marking the state as visited.

Outlines come from the same world-atlas TopoJSON already used by the World Map
and Stats pages (`lib/geo.js`). US uses the Albers USA projection (Alaska and
Hawaii as insets, like a classic US map); China uses Mercator.
