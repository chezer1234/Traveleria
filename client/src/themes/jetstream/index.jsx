import { StampMark, BrandMark } from '../shared';
import { barcodeBars } from '../../lib/themeArt';
import { STYLE_UNLOCK_POINTS } from '../../lib/styleUnlocks';

// Jetstream — bold travel-game energy (light).
// Design source: docs/designs/concept-3-jetstream.html

function JetstreamLogo({ className = '' }) {
  return (
    <span className={`font-display font-black tracking-tight text-ink inline-flex items-center gap-[0.42em] ${className}`}>
      <BrandMark className="h-[1.02em] w-auto shrink-0" />
      <span className="logo-jet">Travel<span className="text-atlas">eria</span></span>
    </span>
  );
}

// Airport-style destination code — pure boarding-pass flavour, never data.
function destCode(name) {
  return name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
}

// The tear-off score stub of the boarding-pass country header (issue #63):
// perforation + punched notches are `.country-stub` chrome in index.css; the
// barcode is a per-country deterministic stack of bars (see lib/themeArt.js).
function JetstreamCountryStub({ country, isVisited, explored, passenger }) {
  const maxTotal = Math.round((country.baseline_points + country.explorer_ceiling) * 10) / 10;
  const km = country.breakdown?.distance?.km;
  const bars = barcodeBars(country.code);
  const pct = Math.round(Math.min(explored ?? 0, 100) * 10) / 10;

  return (
    <aside className="country-stub flex gap-4 px-6 py-5">
      <div className="flex-1 min-w-0 flex flex-col">
        <span className="smallcaps text-ink-soft/80">Traveleria Air · Boarding pass</span>
        {passenger && (
          <span className="smallcaps text-ink-soft/60 truncate">Passenger · {passenger}</span>
        )}
        <div className="mt-3">
          <p className="smallcaps text-ink-soft">{isVisited ? 'Base banked' : 'Base on arrival'}</p>
          <p className="font-display font-black text-4xl tabular-nums text-ink leading-tight">
            {country.baseline_points}
          </p>
          <p className="text-xs text-ink-soft font-semibold">of {maxTotal} max</p>
        </div>
        {isVisited && (
          <div className="mt-3">
            <div
              className="h-2 rounded-full bg-parchment overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Exploration"
            >
              <div className="h-full rounded-full jet-grad" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] font-bold text-ink-soft mt-1">{pct}% explored · keep going</p>
          </div>
        )}
        <div className="mt-auto pt-3 smallcaps text-ink-soft/70 flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Dest <b className="text-ink">{destCode(country.name)}</b>
          </span>
          <span>
            Gate <b className="text-ink">{country.tier === 'microstate' ? 'M' : `T${country.tier}`}</b>
          </span>
          {typeof km === 'number' && <span>{km.toLocaleString()} km</span>}
        </div>
      </div>
      <div className="w-7 self-stretch shrink-0" aria-hidden="true">
        <svg viewBox="0 0 30 200" preserveAspectRatio="none" className="w-full h-full block">
          <g fill="var(--color-ink)">
            {bars.map((b) => (
              <rect key={b.y} x="0" y={b.y} width="30" height={b.h} />
            ))}
          </g>
        </svg>
      </div>
    </aside>
  );
}

export default {
  id: 'jetstream',
  name: 'Jetstream',
  tagline: 'Bold travel-game energy',
  swatch: ['#fdfbf7', '#0f9d8f', '#f59e0b'],
  pageColor: '#fdfbf7',
  Logo: JetstreamLogo,
  VisitedMark: StampMark,
  CountryStub: JetstreamCountryStub,
  map: { dots: false },
  unlock: { points: STYLE_UNLOCK_POINTS.jetstream },
};
