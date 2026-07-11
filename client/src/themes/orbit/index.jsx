import { StampMark } from '../shared';

// Orbit — night-flight mission control (dark).
// Design source: docs/designs/concept-2-orbit.html

function OrbitLogo({ className = '' }) {
  return (
    <span className={`font-display font-bold tracking-tight text-ink inline-flex items-center gap-[0.45em] ${className}`}>
      <span className="logo-orb" aria-hidden="true" />
      <span>
        Travel<span className="text-compass">eria</span>
      </span>
    </span>
  );
}

function fmtCoord(value, pos, neg) {
  return `${Math.abs(value).toFixed(2)}°${value >= 0 ? pos : neg}`;
}

// Telemetry side panel for the country header — target-lock coordinates,
// sector, great-circle distance, and the glowing max readout.
function OrbitCountryStub({ country, isVisited }) {
  const lat = Number(country.lat);
  const lng = Number(country.lng);
  const km = country.breakdown?.distance?.km;
  const maxTotal = Math.round((country.baseline_points + country.explorer_ceiling) * 10) / 10;

  return (
    <aside className="country-stub flex flex-col justify-center gap-1.5 px-6 py-5">
      <span className="smallcaps text-ink-soft/80">{isVisited ? 'Target logged' : 'Target lock'}</span>
      {Number.isFinite(lat) && Number.isFinite(lng) && (
        <span className="smallcaps text-compass">
          {fmtCoord(lat, 'N', 'S')} {fmtCoord(lng, 'E', 'W')}
        </span>
      )}
      <span className="smallcaps text-ink-soft/70">Sector · {country.region}</span>
      {typeof km === 'number' && (
        <span className="smallcaps text-ink-soft/70">Great-circle · {km.toLocaleString()} km</span>
      )}
      <div className="mt-2">
        <p className="smallcaps text-ink-soft">Max total</p>
        <p className="font-display font-bold text-3xl tabular-nums text-compass orbit-glow">{maxTotal}</p>
      </div>
    </aside>
  );
}

export default {
  id: 'orbit',
  name: 'Orbit',
  tagline: 'Night-flight mission control',
  swatch: ['#070d18', '#38e1ff', '#d84a86'],
  pageColor: '#070d18',
  Logo: OrbitLogo,
  VisitedMark: StampMark,
  CountryStub: OrbitCountryStub,
  // The signature dot-matrix Earth (issue #63): world maps render as a glowing
  // dot grid; sub-national maps stay solid polygons per the concept.
  map: { dots: true },
  unlock: null,
};
