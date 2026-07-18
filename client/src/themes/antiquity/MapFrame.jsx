// Antiquity map furniture (issue #69): the world map hangs between fluted
// Greek columns under a carved pediment, and the plate unfolds like a
// physical map when it mounts. Rendered via the registry's optional MapFrame
// slot — Map.jsx wraps the world-map plate in this component when the active
// theme provides one (no theme.id branching, per the registry rules).
//
// All colours come from the antiquity token block in index.css; the unfold
// animation and crease shading are the `.antiquity-*` rules there
// (prefers-reduced-motion renders the map already flat).

// One fluted column: capital (volutes), shaft with flutes, stepped base.
// Stroke/fill inherit from CSS so the stone tint follows the tokens.
function GreekColumn() {
  return (
    <svg
      viewBox="0 0 60 400"
      preserveAspectRatio="none"
      className="antiquity-column"
      aria-hidden="true"
    >
      {/* abacus + volute capital */}
      <rect x="2" y="6" width="56" height="8" rx="2" className="col-stone" />
      <path d="M4 14 h52 v10 a10 10 0 0 1 -10 6 h-32 a10 10 0 0 1 -10 -6 z" className="col-stone" />
      <circle cx="10" cy="20" r="6" className="col-volute" />
      <circle cx="50" cy="20" r="6" className="col-volute" />
      <circle cx="10" cy="20" r="2.5" className="col-volute-eye" />
      <circle cx="50" cy="20" r="2.5" className="col-volute-eye" />
      <rect x="8" y="30" width="44" height="6" className="col-stone" />
      {/* fluted shaft */}
      <rect x="11" y="36" width="38" height="330" className="col-shaft" />
      {[17, 24, 31, 38, 45].map((x) => (
        <line key={x} x1={x} y1="38" x2={x} y2="364" className="col-flute" />
      ))}
      {/* entasis shading on the shaft edges */}
      <rect x="11" y="36" width="4" height="330" className="col-shade" />
      <rect x="45" y="36" width="4" height="330" className="col-shade" />
      {/* stepped base */}
      <rect x="8" y="366" width="44" height="8" className="col-stone" />
      <rect x="4" y="374" width="52" height="9" className="col-stone" />
      <rect x="1" y="383" width="58" height="11" className="col-stone" />
    </svg>
  );
}

// The pediment across the top: a low triangle with dentil blocks and a
// laurel-dot frieze, like the entrance to a map room.
function Pediment() {
  return (
    <svg viewBox="0 0 800 74" preserveAspectRatio="none" className="antiquity-pediment" aria-hidden="true">
      <path d="M12 54 L400 8 L788 54 Z" className="col-stone" />
      <path d="M60 50 L400 17 L740 50 Z" className="col-inset" />
      <rect x="0" y="54" width="800" height="8" className="col-stone" />
      {Array.from({ length: 26 }, (_, i) => (
        <rect key={i} x={16 + i * 30} y="63" width="14" height="7" className="col-stone" />
      ))}
      <text x="400" y="44" textAnchor="middle" className="antiquity-pediment-title">
        ORBIS · TERRARUM
      </text>
    </svg>
  );
}

export default function AntiquityMapFrame({ children }) {
  return (
    <div className="antiquity-frame">
      <Pediment />
      <div className="antiquity-colonnade">
        <GreekColumn />
        {/* The unfolding map: perspective parent + rotateX/scale keyframes,
            with fold-crease shading that fades once the map lies flat. */}
        <div className="antiquity-unfold-stage">
          <div className="antiquity-unfold">
            {children}
            <div className="antiquity-creases" aria-hidden="true" />
          </div>
        </div>
        <GreekColumn />
      </div>
    </div>
  );
}
