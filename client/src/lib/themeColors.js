// Helpers for the few places that need theme tokens as concrete colour values
// (SVG-string attributes can't take var() expressions) — see issue #60.

// Resolve a CSS custom property (e.g. '--color-parchment') to its current
// value. Returns '' outside a browser or when the token is undefined.
export function cssToken(name) {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Linear mix of two #rrggbb colours, t = share of `b` (0..1).
export function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
