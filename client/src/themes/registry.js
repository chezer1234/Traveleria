import atlas from './atlas';
import orbit from './orbit';
import jetstream from './jetstream';

/**
 * Theme registry (issue #63) — the ONE place a design system is registered.
 *
 * Each entry is a self-contained definition: metadata for the switcher
 * (name/tagline/swatch), the page colour for <meta name="theme-color">, and
 * component slots for everything whose STRUCTURE differs per theme (Logo,
 * VisitedMark, CountryStub) plus render-mode flags (map.dots). Colour, font,
 * and shape stay in CSS: the `:root[data-theme="<id>"]` token blocks in
 * index.css.
 *
 * Adding a theme = add a `client/src/themes/<id>/` definition, register it
 * here, add its token block to index.css, and add its id to STYLE_IDS in
 * server/src/lib/schemas.js so the account preference round-trips.
 *
 * The `unlock` field is reserved for future milestone-unlockable designs
 * (e.g. { countries: 25 }); null = always available.
 */
export const THEMES = [atlas, orbit, jetstream];

export const DEFAULT_THEME_ID = 'atlas';

export function getThemeDef(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME_ID);
}
