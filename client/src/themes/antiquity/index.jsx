import PassportStamp from '../atlas/PassportStamp';
import { hashCode } from '../../lib/themeArt';
import { STYLE_UNLOCK_POINTS } from '../../lib/styleUnlocks';
import MapFrame from './MapFrame';

// Antiquity — the old-world archive (issue #69). A vintage map style: aged
// parchment, sepia ink, engraved serif type, Greek columns around the world
// map, and the map unfolding like a physical one. Unlocks at the points
// threshold in lib/styleUnlocks.js (mirrored on the server).

function AntiquityLogo({ className = '' }) {
  return (
    <span className={`antiquity-wordmark font-display font-bold text-ink ${className}`}>
      <span className="antiquity-wordmark-flourish" aria-hidden="true">❦</span>
      Travel<span className="text-gold">eria</span>
    </span>
  );
}

// The country page's side panel: an entry in the grand archive's ledger —
// the deterministic passport stamp (same art as Atlas, tinted sepia by the
// tokens) under an engraved catalogue caption.
function AntiquityCountryStub({ country, isVisited, stampYear }) {
  return (
    <aside className="country-stub flex flex-col items-center justify-center gap-2 px-6 py-5 text-center">
      <span className="smallcaps text-ink-soft/80">Grand archive · folio entry</span>
      {isVisited ? (
        <PassportStamp name={country.name} code={country.code} year={stampYear} />
      ) : (
        <span className="awaiting-stamp text-ink-soft/60" aria-hidden="true">
          <span className="smallcaps">
            Terra
            <br />
            incognita
          </span>
        </span>
      )}
      <span className="smallcaps text-ink-soft/60">
        Fol. {country.code} · No {String(hashCode(country.code) % 10000).padStart(4, '0')}
      </span>
    </aside>
  );
}

export default {
  id: 'antiquity',
  name: 'Antiquity',
  tagline: 'The old-world archive',
  swatch: ['#efe3c8', '#8a5a36', '#9c7c2e'],
  pageColor: '#efe3c8',
  Logo: AntiquityLogo,
  // The stamp in the archive stub IS the visited mark — no inline one.
  VisitedMark: null,
  CountryStub: AntiquityCountryStub,
  map: { dots: false },
  // Greek columns + pediment + the physical-map unfold around the world map.
  MapFrame,
  unlock: { points: STYLE_UNLOCK_POINTS.antiquity },
};
