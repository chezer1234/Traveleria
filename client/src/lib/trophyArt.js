// Original trophy artwork for the 1.6 cabinet (issue #52).
// Feature doc: docs/features/trophies-1-6.md
// Browsable art sheet: docs/designs/trophies-1-6.html (imports this module).
//
// Everything is hand-drawn SVG — no raster assets. Each trophy category has
// its own silhouette; the tier picks the metal finish. `trophyMarkup(shape,
// opts)` returns the inner SVG for a 120×150 viewBox as a string, so the same
// geometry renders in the React cabinet (components/TrophyMedal.jsx) and in
// the static design sheet.

export const TIERS = ['bronze', 'silver', 'gold', 'diamond', 'platinum'];

// Metal finishes. deep/mid/hi build the gradient; edge outlines the body;
// engrave draws the fine Atlas-style detail lines.
export const FINISHES = {
  bronze:   { deep: '#6e4526', mid: '#a97142', hi: '#e0a877', edge: '#5c3a20', engrave: '#3f2b18' },
  silver:   { deep: '#71767c', mid: '#a7adb4', hi: '#eceef1', edge: '#5c6167', engrave: '#3d4147' },
  gold:     { deep: '#a8871f', mid: '#cfa92e', hi: '#f2dc85', edge: '#84681a', engrave: '#4a3c0e' },
  diamond:  { deep: '#4f83a8', mid: '#9cc8e2', hi: '#ecf8ff', edge: '#3f6f92', engrave: '#2d5573' },
  platinum: { deep: '#84889c', mid: '#c4c8d6', hi: '#f7f7fb', edge: '#6d718a', engrave: '#44485c' },
};

// Locked trophies are blind-embossed parchment (the 1.5 convention: present,
// waiting, never hidden).
export const LOCKED_FINISH = {
  deep: '#e2d9c4', mid: '#efe9db', hi: '#f8f4ea', edge: '#d3c8ad', engrave: '#c3b795',
};

export const TIER_LABELS = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond', platinum: 'Platinum',
};

// ── tiny geometry helpers ────────────────────────────────────────────────────

// Four-point glint star, the sparkle on diamond and platinum finishes.
function sparkle(x, y, s, edge, opacity = 0.95) {
  const t = s / 3.2;
  return `<path d="M${x} ${y - s} L${x + t} ${y - t} L${x + s} ${y} L${x + t} ${y + t} L${x} ${y + s} L${x - t} ${y + t} L${x - s} ${y} L${x - t} ${y - t} Z" fill="#ffffff" stroke="${edge}" stroke-width="0.6" opacity="${opacity}"/>`;
}

// Where each silhouette catches the light — glints sit on the metal, not in
// the air, so they read against the parchment background.
const MEDALLION_GLINTS = [[87, 64, 7], [33, 119, 4.5], [95, 44, 3.5]];
const GLINTS = {
  cup:     [[90, 30, 7], [30, 78, 4.5], [64, 100, 3.5]],
  globe:   [[86, 36, 7], [30, 80, 4.5], [66, 112, 3.5]],
  range:   [[75, 45, 7], [45, 57, 4.5], [92, 104, 3.5]],
  obelisk: [[60, 17, 7], [70, 56, 4.5], [30, 80, 3.5]],
  torch:   [[71, 19, 7], [46, 42, 4.5], [66, 100, 3.5]],
  laurel:  [[60, 38, 7], [92, 62, 4.5], [28, 88, 3.5]],
  stamp:   [[90, 34, 7], [32, 100, 4.5], [80, 118, 3.5]],
  mapx:    [[92, 38, 7], [28, 100, 4.5], [60, 128, 3.5]],
  compass: MEDALLION_GLINTS, island: MEDALLION_GLINTS, plane: MEDALLION_GLINTS,
  peak: MEDALLION_GLINTS, seal: MEDALLION_GLINTS,
};

// Crossed ribbon tails that medallion-style trophies hang from.
function ribbons(p) {
  return (
    `<path d="M43 4 L53 46 L67 42 L57 4 Z" fill="${p.deep}" stroke="${p.edge}" stroke-width="1"/>` +
    `<path d="M77 4 L67 46 L53 42 L63 4 Z" fill="${p.mid}" stroke="${p.edge}" stroke-width="1"/>`
  );
}

// Two-step plinth every standing trophy sits on.
function plinth(p, g, topW = 44, y = 116) {
  const x1 = 60 - topW / 2;
  return (
    `<path d="M${x1} ${y} h${topW} l6 12 H${x1 - 6} Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
    `<rect x="${x1 - 11}" y="${y + 12}" width="${topW + 22}" height="7" rx="2" fill="${p.deep}" stroke="${p.edge}" stroke-width="1"/>`
  );
}

// ── the silhouettes ──────────────────────────────────────────────────────────
// Each takes (palette, gradientUrls, glyph) and returns inner-SVG markup.

const SHAPES = {

  // Travel Points — the loving cup: twin handles, engraved band and star.
  cup(p, g) {
    return (
      `<path d="M28 42 C8 44 8 70 32 74" fill="none" stroke="${g.m}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M92 42 C112 44 112 70 88 74" fill="none" stroke="${g.m}" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M28 42 C8 44 8 70 32 74" fill="none" stroke="${p.edge}" stroke-width="1" opacity="0.6"/>` +
      `<path d="M92 42 C112 44 112 70 88 74" fill="none" stroke="${p.edge}" stroke-width="1" opacity="0.6"/>` +
      `<path d="M28 38 L92 38 L92 50 C92 76 79 90 60 90 C41 90 28 76 28 50 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<rect x="24" y="32" width="72" height="8" rx="3" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<path d="M33 54 H87" stroke="${p.engrave}" stroke-width="0.9" opacity="0.85"/>` +
      `<path d="M35 60 H85" stroke="${p.engrave}" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.7"/>` +
      `<path d="M60 66 L62.2 71 L67.5 71.6 L63.6 75.2 L64.7 80.4 L60 77.7 L55.3 80.4 L56.4 75.2 L52.5 71.6 L57.8 71 Z" fill="${p.engrave}" opacity="0.85"/>` +
      `<path d="M56 90 C56 98 51 102 45 106 L75 106 C69 102 64 98 64 90 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      plinth(p, g, 40, 106) +
      `<path d="M36 36 C36 36 38 62 48 76" stroke="${p.hi}" stroke-width="2.5" fill="none" opacity="0.55" stroke-linecap="round"/>`
    );
  },

  // Countries — globe on a plinth, meridians engraved.
  globe(p, g) {
    return (
      `<circle cx="60" cy="60" r="35" fill="${g.r}" stroke="${p.edge}" stroke-width="1.8"/>` +
      `<ellipse cx="60" cy="60" rx="14.5" ry="35" fill="none" stroke="${p.engrave}" stroke-width="0.8" opacity="0.75"/>` +
      `<ellipse cx="60" cy="60" rx="26.5" ry="35" fill="none" stroke="${p.engrave}" stroke-width="0.7" opacity="0.55"/>` +
      `<path d="M25 60 H95" stroke="${p.engrave}" stroke-width="0.9" opacity="0.8"/>` +
      `<path d="M28.5 43 Q60 35 91.5 43" stroke="${p.engrave}" stroke-width="0.7" fill="none" opacity="0.6"/>` +
      `<path d="M28.5 77 Q60 85 91.5 77" stroke="${p.engrave}" stroke-width="0.7" fill="none" opacity="0.6"/>` +
      `<path d="M40 38 C46 34 52 40 47 45 C54 44 58 50 52 54 C46 57 40 52 42 47 C37 45 36 41 40 38 Z" fill="${p.deep}" opacity="0.5"/>` +
      `<path d="M68 66 C74 63 80 67 77 72 C73 77 66 74 68 66 Z" fill="${p.deep}" opacity="0.5"/>` +
      `<path d="M30 84 A38 38 0 0 0 90 84 L85 92 A30 30 0 0 1 35 92 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.2"/>` +
      `<rect x="54" y="96" width="12" height="20" fill="${g.m}" stroke="${p.edge}" stroke-width="1.2"/>` +
      plinth(p, g, 46) +
      `<path d="M44 34 A30 30 0 0 1 58 27" stroke="${p.hi}" stroke-width="2.5" fill="none" opacity="0.7" stroke-linecap="round"/>`
    );
  },

  // Continents — a mountain range under a rising sun.
  range(p, g) {
    return (
      `<circle cx="79" cy="50" r="15" fill="${p.hi}" stroke="${p.edge}" stroke-width="1.2"/>` +
      `<g stroke="${p.engrave}" stroke-width="0.8" opacity="0.7">` +
      `<path d="M79 28 V22"/><path d="M96 33 L100 29"/><path d="M101 50 H107"/><path d="M62 33 L58 29"/>` +
      `</g>` +
      `<path d="M20 116 L45 58 L58 88 L74 46 L100 116 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M45 58 L39 73 L47 69 L52 76 Z" fill="${p.hi}" opacity="0.9"/>` +
      `<path d="M74 46 L67 62 L75 58 L81 64 Z" fill="${p.hi}" opacity="0.9"/>` +
      `<path d="M45 58 L49 80" stroke="${p.engrave}" stroke-width="0.7" opacity="0.5"/>` +
      `<path d="M74 46 L71 70" stroke="${p.engrave}" stroke-width="0.7" opacity="0.5"/>` +
      `<path d="M58 88 L62 96" stroke="${p.engrave}" stroke-width="0.7" opacity="0.5"/>` +
      plinth(p, g, 66)
    );
  },

  // Sub-regions — the compass rose medallion.
  compass(p, g) {
    return (
      ribbons(p) +
      `<circle cx="60" cy="92" r="38" fill="${g.r}" stroke="${p.edge}" stroke-width="2.5"/>` +
      `<circle cx="60" cy="92" r="31" fill="none" stroke="${p.engrave}" stroke-width="0.8" opacity="0.8"/>` +
      `<circle cx="60" cy="92" r="25" fill="none" stroke="${p.engrave}" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.7"/>` +
      `<path d="M60 71 L64 88 L81 92 L64 96 L60 113 L56 96 L39 92 L56 88 Z" fill="${p.deep}" opacity="0.45"/>` +
      `<path d="M60 63 L65.5 86.5 L89 92 L65.5 97.5 L60 121 L54.5 97.5 L31 92 L54.5 86.5 Z" fill="${p.hi}" stroke="${p.engrave}" stroke-width="0.9" stroke-linejoin="round"/>` +
      `<path d="M60 63 L65.5 86.5 L60 92 Z M89 92 L65.5 97.5 L60 92 Z M60 121 L54.5 97.5 L60 92 Z M31 92 L54.5 86.5 L60 92 Z" fill="${p.deep}" opacity="0.55"/>` +
      `<circle cx="60" cy="92" r="4" fill="${p.deep}" stroke="${p.engrave}" stroke-width="0.8"/>` +
      `<circle cx="60" cy="92" r="1.4" fill="${p.hi}"/>` +
      `<path d="M60 68 L62 73 H58 Z" fill="${p.engrave}"/>`
    );
  },

  // Cities — obelisk with a skyline at its feet.
  obelisk(p, g) {
    return (
      `<rect x="26" y="84" width="10" height="32" fill="${p.deep}" opacity="0.8"/>` +
      `<rect x="38" y="94" width="8" height="22" fill="${p.deep}" opacity="0.6"/>` +
      `<rect x="84" y="90" width="8" height="26" fill="${p.deep}" opacity="0.6"/>` +
      `<rect x="93" y="80" width="10" height="36" fill="${p.deep}" opacity="0.8"/>` +
      `<g fill="${p.hi}" opacity="0.85">` +
      `<rect x="28.5" y="88" width="2" height="2"/><rect x="33" y="88" width="2" height="2"/><rect x="28.5" y="94" width="2" height="2"/><rect x="33" y="94" width="2" height="2"/><rect x="28.5" y="100" width="2" height="2"/>` +
      `<rect x="95.5" y="84" width="2" height="2"/><rect x="100" y="84" width="2" height="2"/><rect x="95.5" y="90" width="2" height="2"/><rect x="100" y="90" width="2" height="2"/><rect x="100" y="96" width="2" height="2"/>` +
      `</g>` +
      `<path d="M60 18 L69 36 H51 Z" fill="${p.hi}" stroke="${p.edge}" stroke-width="1.2" stroke-linejoin="round"/>` +
      `<path d="M52 36 H68 L72 116 H48 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<path d="M60 44 V108" stroke="${p.engrave}" stroke-width="0.7" stroke-dasharray="4 3" opacity="0.6"/>` +
      `<path d="M55 40 L52 112" stroke="${p.hi}" stroke-width="1.8" opacity="0.5" stroke-linecap="round"/>` +
      plinth(p, g, 40)
    );
  },

  // Island nations — palm over waves inside a porthole ring.
  island(p, g) {
    return (
      ribbons(p) +
      `<circle cx="60" cy="92" r="38" fill="${g.m}" stroke="${p.edge}" stroke-width="2.5"/>` +
      `<circle cx="60" cy="92" r="28" fill="${p.hi}" stroke="${p.engrave}" stroke-width="1"/>` +
      `<g stroke="${p.engrave}" stroke-width="1" fill="none" opacity="0.8">` +
      `<path d="M36 104 Q42 100 48 104 T60 104 T72 104 T84 104"/>` +
      `<path d="M40 111 Q46 107 52 111 T64 111 T76 111"/>` +
      `</g>` +
      `<ellipse cx="63" cy="103" rx="15" ry="4.5" fill="${p.deep}" opacity="0.8"/>` +
      `<path d="M60 102 C59 92 56 84 49 78" stroke="${p.deep}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<g stroke="${p.deep}" stroke-width="2.2" fill="none" stroke-linecap="round">` +
      `<path d="M49 78 Q38 74 33 78"/>` +
      `<path d="M49 78 Q40 68 33 68"/>` +
      `<path d="M49 78 Q48 66 42 62"/>` +
      `<path d="M49 78 Q56 68 63 66"/>` +
      `<path d="M49 78 Q60 74 65 77"/>` +
      `</g>` +
      `<circle cx="51.5" cy="80.5" r="1.8" fill="${p.deep}"/><circle cx="47" cy="81.5" r="1.8" fill="${p.deep}"/>` +
      `<g fill="${p.deep}" opacity="0.9">` +
      `<circle cx="60" cy="57.5" r="1.5"/><circle cx="84.5" cy="72" r="1.5"/><circle cx="94.5" cy="92" r="1.5"/><circle cx="84.5" cy="112" r="1.5"/>` +
      `<circle cx="60" cy="126.5" r="1.5"/><circle cx="35.5" cy="112" r="1.5"/><circle cx="25.5" cy="92" r="1.5"/><circle cx="35.5" cy="72" r="1.5"/>` +
      `</g>`
    );
  },

  // Experiences — a lit torch.
  torch(p, g) {
    return (
      `<path d="M60 14 C75 31 78 43 69 53 C64.5 58 55.5 58 51 53 C42 43 45 31 60 14 Z" fill="${p.hi}" stroke="${p.edge}" stroke-width="1.3"/>` +
      `<path d="M60 30 C67 38 68 45 63.5 50 C61.5 52.5 58.5 52.5 56.5 50 C52 45 53 38 60 30 Z" fill="${p.deep}" opacity="0.75"/>` +
      `<path d="M41 58 H79 L72 70 H48 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<path d="M44 63 H76" stroke="${p.engrave}" stroke-width="0.7" stroke-dasharray="2 2.5" opacity="0.7"/>` +
      `<path d="M52 70 H68 L64 116 H56 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<path d="M53.5 82 H66.5 M54.5 92 H65.5" stroke="${p.engrave}" stroke-width="0.9" opacity="0.75"/>` +
      `<path d="M56 72 L54 112" stroke="${p.hi}" stroke-width="1.6" opacity="0.55" stroke-linecap="round"/>` +
      plinth(p, g, 36)
    );
  },

  // Continental conquests — laurel wreath crowning the continent's initials.
  laurel(p, g, glyph) {
    return (
      LAUREL_LEAVES.replaceAll('LFILL', g.m).replaceAll('LEDGE', p.edge) +
      `<path d="M40 126 C24 108 20 78 34 54" stroke="${p.edge}" stroke-width="1.8" fill="none"/>` +
      `<path d="M80 126 C96 108 100 78 86 54" stroke="${p.edge}" stroke-width="1.8" fill="none"/>` +
      `<path d="M52 128 L60 122 L68 128 L60 138 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.2"/>` +
      `<text x="60" y="92" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="34" fill="${g.m}" stroke="${p.edge}" stroke-width="0.8">${glyph || ''}</text>` +
      `<path d="M60 40 L62 45 L67 45.6 L63.4 49 L64.4 54 L60 51.4 L55.6 54 L56.6 49 L53 45.6 L58 45 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="0.8"/>`
    );
  },

  // First Stamp — the passport stamp, perforated.
  stamp(p, g) {
    return (
      `<rect x="28" y="36" width="64" height="80" rx="3" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<rect x="31.5" y="39.5" width="57" height="73" rx="1.5" fill="none" stroke="${p.engrave}" stroke-width="0.8" stroke-dasharray="1 3.4" opacity="0.9"/>` +
      `<rect x="37" y="45" width="46" height="62" fill="none" stroke="${p.engrave}" stroke-width="1"/>` +
      `<text x="60" y="78" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="36" fill="${p.deep}">1</text>` +
      `<path d="M42 52 H60 M42 57 H54" stroke="${p.engrave}" stroke-width="0.8" opacity="0.6"/>` +
      `<g stroke="${p.engrave}" stroke-width="0.9" fill="none" opacity="0.75">` +
      `<path d="M62 96 Q72 92 80 96"/><path d="M62 100 Q72 96 80 100"/>` +
      `</g>` +
      plinth(p, g, 52)
    );
  },

  // The 10,000 km Club — paper plane on a dashed great-circle.
  plane(p, g) {
    return (
      ribbons(p) +
      `<circle cx="60" cy="92" r="38" fill="${g.r}" stroke="${p.edge}" stroke-width="2.5"/>` +
      `<circle cx="60" cy="92" r="31" fill="none" stroke="${p.engrave}" stroke-width="0.8" opacity="0.8"/>` +
      `<path d="M34 114 A34 30 0 0 1 60 122 A34 30 0 0 1 86 114" stroke="${p.engrave}" stroke-width="0.8" fill="none" opacity="0.6"/>` +
      `<path d="M33 104 Q45 78 60 90 T84 68" stroke="${p.engrave}" stroke-width="1.1" stroke-dasharray="3 3.5" fill="none" opacity="0.9"/>` +
      `<path d="M90 64 L66 73 L77 78 Z" fill="${p.hi}" stroke="${p.engrave}" stroke-width="1" stroke-linejoin="round"/>` +
      `<path d="M90 64 L77 78 L76 86 L81 79.5 Z" fill="${p.deep}" stroke="${p.engrave}" stroke-width="1" stroke-linejoin="round"/>` +
      `<circle cx="33" cy="104" r="2" fill="${p.deep}"/>`
    );
  },

  // Hard Mode — the summit medal, flag planted.
  peak(p, g) {
    return (
      ribbons(p) +
      `<circle cx="60" cy="92" r="38" fill="${g.r}" stroke="${p.edge}" stroke-width="2.5"/>` +
      `<circle cx="60" cy="92" r="31" fill="none" stroke="${p.engrave}" stroke-width="0.8" opacity="0.8"/>` +
      `<path d="M31 116 L52 68 L62 86 L74 62 L89 116 Z" fill="${p.deep}" stroke="${p.engrave}" stroke-width="1" stroke-linejoin="round" opacity="0.9"/>` +
      `<path d="M52 68 L47 80 L54 77 L58 82 Z" fill="${p.hi}"/>` +
      `<path d="M74 62 L69 74 L75 71 L79 76 Z" fill="${p.hi}"/>` +
      `<path d="M74 62 V50 L83 53.5 L74 57" fill="none" stroke="${p.hi}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M74 50 L83 53.5 L74 57 Z" fill="${p.hi}"/>`
    );
  },

  // Century Nation — the wax-seal rosette, 100 from one nation.
  seal(p, g, glyph) {
    return (
      ribbons(p) +
      SEAL_SCALLOPS.replaceAll('SFILL', g.m).replaceAll('SEDGE', p.edge) +
      `<circle cx="60" cy="92" r="34" fill="${g.r}" stroke="${p.edge}" stroke-width="1.5"/>` +
      `<circle cx="60" cy="92" r="27" fill="none" stroke="${p.engrave}" stroke-width="0.8" opacity="0.8"/>` +
      `<circle cx="60" cy="92" r="23" fill="none" stroke="${p.engrave}" stroke-width="0.6" stroke-dasharray="2 3" opacity="0.7"/>` +
      `<text x="60" y="90" text-anchor="middle" dominant-baseline="central" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="22" fill="${p.deep}">${glyph || '100'}</text>` +
      `<path d="M50 105 H70" stroke="${p.engrave}" stroke-width="0.8" opacity="0.7"/>` +
      `<path d="M60 74 L61.5 77.5 L65 78 L62.5 80.5 L63 84 L60 82.2 L57 84 L57.5 80.5 L55 78 L58.5 77.5 Z" fill="${p.engrave}" opacity="0.8"/>`
    );
  },

  // Off the Map — the folded chart, dotted trail to an X.
  mapx(p, g) {
    return (
      `<path d="M26 46 L49 38 L49 118 L26 126 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M49 38 L72 46 L72 126 L49 118 Z" fill="${p.hi}" stroke="${p.edge}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M72 46 L94 40 L94 120 L72 126 Z" fill="${g.m}" stroke="${p.edge}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<g stroke="${p.engrave}" stroke-width="0.7" fill="none" opacity="0.55">` +
      `<path d="M30 62 Q38 58 45 61"/><path d="M29 80 Q38 76 45 79"/><path d="M30 98 Q38 94 45 97"/>` +
      `<path d="M76 60 Q84 56 91 59"/><path d="M75 78 Q84 74 91 77"/><path d="M76 96 Q84 92 91 95"/>` +
      `</g>` +
      `<path d="M53 110 C56 96 66 98 63 84 C61 74 74 68 80 62" stroke="${p.deep}" stroke-width="1.4" stroke-dasharray="2.5 3.5" fill="none"/>` +
      `<circle cx="53" cy="110" r="2.2" fill="${p.deep}"/>` +
      `<path d="M77 56 L85 64 M85 56 L77 64" stroke="${p.deep}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="57" cy="52" r="5" fill="none" stroke="${p.engrave}" stroke-width="0.9"/>` +
      `<path d="M57 48.5 L58.5 52 L57 55.5 L55.5 52 Z" fill="${p.engrave}"/>`
    );
  },
};

export const SHAPE_NAMES = Object.keys(SHAPES);

// ── precomputed detail work ──────────────────────────────────────────────────

// Laurel leaves — pairs along each stem, mirrored. Built once; fill/edge are
// substituted per render.
const LAUREL_LEAVES = (() => {
  // [x, y, angle] anchor points marching up the left stem.
  const anchors = [
    [37, 118, -55], [30, 106, -70], [26, 92, -85], [25, 78, -100], [28, 64, -118], [34, 53, -135],
  ];
  const leaf = 'M0 0 Q7 -4.5 15 0 Q7 4.5 0 0 Z';
  let out = '';
  for (const [x, y, a] of anchors) {
    out += `<path d="${leaf}" transform="translate(${x} ${y}) rotate(${a})" fill="LFILL" stroke="LEDGE" stroke-width="0.9"/>`;
    out += `<path d="${leaf}" transform="translate(${120 - x} ${y}) rotate(${180 - a})" fill="LFILL" stroke="LEDGE" stroke-width="0.9"/>`;
  }
  return out;
})();

// Wax-seal scallop bumps — twelve lobes behind the seal disc.
const SEAL_SCALLOPS = (() => {
  let out = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = 60 + Math.cos(a) * 34;
    const y = 92 + Math.sin(a) * 34;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="SFILL" stroke="SEDGE" stroke-width="1.2"/>`;
  }
  return out;
})();

// ── renderer ─────────────────────────────────────────────────────────────────

let uid = 0;

export const TROPHY_VIEWBOX = '0 0 120 150';

// Inner SVG for one trophy. Wrap in
//   <svg viewBox={TROPHY_VIEWBOX}>…</svg>
// glyph is only used by letter-bearing shapes (laurel, seal).
// `finish` overrides the metal/locked palette — TrophyMedal.jsx passes a
// theme-derived locked finish (issue #60) so blind-embossed trophies sit on
// the selected style's paper. The gradients live in SVG attributes, so the
// caller must resolve tokens to concrete colours first (no var() here).
export function trophyMarkup(shape, { tier = 'gold', earned = true, glyph = '', finish = null } = {}) {
  const draw = SHAPES[shape] || SHAPES.compass;
  const p = finish || (earned ? (FINISHES[tier] || FINISHES.gold) : LOCKED_FINISH);
  const id = `tro${++uid}`;
  const g = { m: `url(#${id}m)`, r: `url(#${id}r)` };

  const defs =
    `<defs>` +
    `<linearGradient id="${id}m" x1="0" y1="0" x2="0.55" y2="1">` +
    `<stop offset="0" stop-color="${p.hi}"/><stop offset="0.45" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.deep}"/>` +
    `</linearGradient>` +
    `<radialGradient id="${id}r" cx="0.35" cy="0.3" r="1.05">` +
    `<stop offset="0" stop-color="${p.hi}"/><stop offset="0.55" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.deep}"/>` +
    `</radialGradient>` +
    `</defs>`;

  // The top two tiers glitter — glints anchored to each silhouette.
  let glints = '';
  if (earned && (tier === 'diamond' || tier === 'platinum')) {
    const scale = tier === 'platinum' ? 1.15 : 1;
    glints = (GLINTS[shape] || MEDALLION_GLINTS)
      .map(([x, y, s]) => sparkle(x, y, s * scale, p.edge))
      .join('');
  }

  return defs + draw(p, g, glyph) + glints;
}
