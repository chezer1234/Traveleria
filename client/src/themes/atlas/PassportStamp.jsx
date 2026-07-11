import { stampDesign } from '../../lib/themeArt';

/**
 * Atlas passport stamp (issue #63) — a distinctive, deterministic per-country
 * entry stamp: 10 frame shapes × 6 ink-pad colours × wording variants, all
 * derived from the ISO code so Japan is always the same stamp on every device.
 *
 * Drawn as one 170×120 SVG. Round frames arc the country name with textPath;
 * angular frames set it straight. Long names shrink to fit.
 */

const W = 170;
const H = 120;
const CX = W / 2;
const CY = H / 2;

function nameFontSize(name) {
  if (name.length > 20) return 7;
  if (name.length > 14) return 8.5;
  if (name.length > 9) return 10;
  return 11.5;
}

// Frame drawings, keyed by shape id. Each returns stroked outline elements
// (stroke/opacity inherited from the parent group).
const FRAMES = {
  'circle-double': (
    <>
      <circle cx={CX} cy={CY} r={56} strokeWidth={3} />
      <circle cx={CX} cy={CY} r={50} strokeWidth={1.2} />
      <circle cx={CX} cy={CY} r={30} strokeWidth={0.9} />
    </>
  ),
  'circle-dashed': (
    <>
      <circle cx={CX} cy={CY} r={56} strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={48} strokeWidth={1} strokeDasharray="3 3" />
    </>
  ),
  oval: (
    <>
      <ellipse cx={CX} cy={CY} rx={82} ry={56} strokeWidth={3} />
      <ellipse cx={CX} cy={CY} rx={75} ry={49} strokeWidth={1.2} />
    </>
  ),
  rect: (
    <>
      <rect x={13} y={16} width={W - 26} height={H - 32} strokeWidth={2.5} />
      <rect x={18} y={21} width={W - 36} height={H - 42} strokeWidth={1} />
    </>
  ),
  'rounded-rect': (
    <>
      <rect x={13} y={16} width={W - 26} height={H - 32} rx={12} strokeWidth={2.5} />
      <line x1={30} y1={44} x2={W - 30} y2={44} strokeWidth={1} />
      <line x1={30} y1={H - 42} x2={W - 30} y2={H - 42} strokeWidth={1} />
    </>
  ),
  hexagon: (
    <>
      <polygon points={`${CX},6 ${W - 20},33 ${W - 20},${H - 33} ${CX},${H - 6} 20,${H - 33} 20,33`} strokeWidth={2.5} />
      <polygon points={`${CX},13 ${W - 26},37 ${W - 26},${H - 37} ${CX},${H - 13} 26,${H - 37} 26,37`} strokeWidth={1} />
    </>
  ),
  octagon: (
    <>
      <polygon
        points={`52,10 ${W - 52},10 ${W - 16},40 ${W - 16},${H - 40} ${W - 52},${H - 10} 52,${H - 10} 16,${H - 40} 16,40`}
        strokeWidth={2.5}
      />
      <polygon
        points={`55,16 ${W - 55},16 ${W - 22},43 ${W - 22},${H - 43} ${W - 55},${H - 16} 55,${H - 16} 22,${H - 43} 22,43`}
        strokeWidth={1}
      />
    </>
  ),
  shield: (
    <>
      <path d={`M22,14 H${W - 22} V${H - 46} Q${W - 22},${H - 22} ${CX},${H - 8} Q22,${H - 22} 22,${H - 46} Z`} strokeWidth={2.5} />
      <path d={`M28,20 H${W - 28} V${H - 48} Q${W - 28},${H - 27} ${CX},${H - 15} Q28,${H - 27} 28,${H - 48} Z`} strokeWidth={1} />
    </>
  ),
  diamond: (
    <>
      <polygon points={`${CX},4 ${W - 8},${CY} ${CX},${H - 4} 8,${CY}`} strokeWidth={2.5} />
      <polygon points={`${CX},14 ${W - 22},${CY} ${CX},${H - 14} 22,${CY}`} strokeWidth={1} />
    </>
  ),
  arch: (
    <>
      <path d={`M16,${H - 16} V64 A69,50 0 0 1 ${W - 16},64 V${H - 16} Z`} strokeWidth={2.5} />
      <path d={`M22,${H - 22} V66 A63,44 0 0 1 ${W - 22},66 V${H - 22} Z`} strokeWidth={1} />
      <line x1={22} y1={H - 40} x2={W - 22} y2={H - 40} strokeWidth={0.8} />
    </>
  ),
};

// Shapes that arc the country name along the top of the frame.
const ARC_TOP = {
  'circle-double': `M${CX},${CY} m-42,0 a42,42 0 1,1 84,0`,
  'circle-dashed': `M${CX},${CY} m-40,0 a40,40 0 1,1 80,0`,
  oval: `M${CX},${CY} m-66,0 a66,40 0 1,1 132,0`,
  arch: `M30,66 A55,38 0 0 1 ${W - 30},66`,
};

const ARC_BOTTOM = {
  'circle-double': `M${CX},${CY} m-42,0 a42,42 0 1,0 84,0`,
  'circle-dashed': `M${CX},${CY} m-40,0 a40,40 0 1,0 80,0`,
  oval: `M${CX},${CY} m-66,0 a66,40 0 1,0 132,0`,
};

export default function PassportStamp({ name, code, year, className = '' }) {
  const design = stampDesign(code);
  const { shape, ink, word, sub, rotation } = design;
  const displayName = name.toUpperCase();
  const fs = nameFontSize(displayName);
  const arcTop = ARC_TOP[shape];
  const arcBottom = ARC_BOTTOM[shape];
  const footer = year ? `${code} · ${year}` : code;
  // Tight frames leave less room for the centre stack.
  const compact = shape === 'diamond' || shape === 'shield';
  const arcId = `stamp-${code}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={className}
      style={{ transform: `rotate(${rotation}deg)` }}
      role="img"
      aria-label={`${word} — ${name}${year ? `, ${year}` : ''}`}
    >
      <g fill="none" stroke={ink.color} opacity={0.88}>
        {FRAMES[shape]}
      </g>
      {(arcTop || arcBottom) && (
        <defs>
          {arcTop && <path id={`${arcId}-t`} d={arcTop} />}
          {arcBottom && <path id={`${arcId}-b`} d={arcBottom} />}
        </defs>
      )}
      <g fill={ink.color} opacity={0.9} fontFamily="Inter, sans-serif" fontWeight={700}>
        {arcTop ? (
          <text fontSize={fs} letterSpacing={displayName.length > 14 ? 1 : 2.5}>
            <textPath href={`#${arcId}-t`} startOffset="50%" textAnchor="middle">
              {displayName}
            </textPath>
          </text>
        ) : (
          <text
            x={CX}
            y={compact ? CY - 14 : 34}
            textAnchor="middle"
            fontSize={fs}
            letterSpacing={displayName.length > 14 ? 0.6 : 2}
            {...(displayName.length > 16 ? { textLength: W - 56, lengthAdjust: 'spacingAndGlyphs' } : {})}
          >
            {displayName}
          </text>
        )}

        <text x={CX} y={compact ? CY + 3 : CY + 4} textAnchor="middle" fontSize={compact ? 11 : 13} letterSpacing={2.5}>
          {word}
        </text>
        {!compact && (
          <text x={CX} y={CY + 17} textAnchor="middle" fontSize={7} letterSpacing={1.5} fontWeight={600}>
            {sub}
          </text>
        )}

        {arcBottom ? (
          <text fontSize={9} letterSpacing={3}>
            <textPath href={`#${arcId}-b`} startOffset="50%" textAnchor="middle">
              {`· ${footer} ·`}
            </textPath>
          </text>
        ) : (
          <text x={CX} y={compact ? CY + 16 : H - 26} textAnchor="middle" fontSize={9} letterSpacing={2} fontWeight={600}>
            {footer}
          </text>
        )}
      </g>
    </svg>
  );
}
