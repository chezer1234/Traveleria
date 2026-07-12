// Deterministic art helpers for theme signature elements (issue #63).
// The rule (Charlie's): every country should look a bit different, but the
// SAME country must always get the SAME stamp/barcode — so everything here
// derives from a hash of the ISO code. No randomness at render time.

// FNV-1a — small, stable, good avalanche for short strings like 'JP'.
export function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Atlas passport stamps ───────────────────────────────────────────────────
// 10 frame shapes × 6 ink-pad colours (+ wording variants) — well past the
// "20 or so" the issue asks for, so neighbouring countries rarely match.

export const STAMP_SHAPES = [
  'circle-double',
  'circle-dashed',
  'oval',
  'rect',
  'rounded-rect',
  'hexagon',
  'octagon',
  'shield',
  'diamond',
  'arch',
];

// Physical stamp-pad inks — deliberately constant hexes, not theme tokens:
// a passport stamp keeps its ink colour whatever the app looks like (same
// rationale as trophy metals, see docs/features/user-selectable-styles.md).
export const STAMP_INKS = [
  { id: 'indigo', color: '#31549b' },
  { id: 'carmine', color: '#a53a35' },
  { id: 'forest', color: '#3e6b45' },
  { id: 'violet', color: '#6d4a8f' },
  { id: 'teal', color: '#2a6f72' },
  { id: 'sepia', color: '#7a5230' },
];

export const STAMP_WORDS = ['VISITED', 'ADMITTED', 'ENTRY', 'ARRIVAL', 'LANDED', 'EXPLORED'];
export const STAMP_SUBS = ['IMMIGRATION', 'BORDER CONTROL', 'PORT OF ENTRY'];

export function stampDesign(code) {
  const h = hashCode(code.toUpperCase());
  return {
    shape: STAMP_SHAPES[h % STAMP_SHAPES.length],
    ink: STAMP_INKS[(h >>> 4) % STAMP_INKS.length],
    word: STAMP_WORDS[(h >>> 8) % STAMP_WORDS.length],
    sub: STAMP_SUBS[(h >>> 12) % STAMP_SUBS.length],
    // Hand-stamped jitter: −6°…+6°, but never dead straight (0° reads printed).
    rotation: ((h >>> 16) % 13) - 6 || 2,
    serial: String(h % 10000).padStart(4, '0'),
  };
}

// ── Jetstream boarding-pass barcode ─────────────────────────────────────────
// A vertical stack of full-width bars with irregular heights/gaps (the mockup
// hand-authored 27 <rect>s; we generate an equivalent sequence per country).

export function barcodeBars(code, total = 200) {
  let s = hashCode(`bar:${code.toUpperCase()}`) || 1;
  // LCG — deterministic, seeded by the country hash.
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const bars = [];
  let y = 0;
  while (y < total - 2) {
    const h = Math.min(2 + Math.round(next() * 6), total - y); // 2..8
    bars.push({ y, h });
    y += h + 2 + Math.round(next() * 4); // gap 2..6
  }
  return bars;
}
