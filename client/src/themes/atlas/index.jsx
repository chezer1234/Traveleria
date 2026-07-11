import PassportStamp from './PassportStamp';
import { hashCode } from '../../lib/themeArt';

// Atlas — heirloom expedition atlas (Charlie's chosen default direction).
// Design source: docs/designs/concept-1-atlas.html

function AtlasLogo({ className = '' }) {
  return (
    <span className={`font-display font-black tracking-tight text-ink ${className}`}>
      Travel<span className="text-gold">eria</span>
    </span>
  );
}

// The country page's tear-off ticket stub: the passport stamp when visited,
// a dashed "awaiting stamp" placeholder when not (issue #63 call-out).
function AtlasCountryStub({ country, isVisited, stampYear }) {
  return (
    <aside className="country-stub flex flex-col items-center justify-center gap-2 px-6 py-5 text-center">
      <span className="smallcaps text-ink-soft/80">Explorer's ticket · Admit one</span>
      {isVisited ? (
        <PassportStamp name={country.name} code={country.code} year={stampYear} />
      ) : (
        <span className="awaiting-stamp text-ink-soft/60" aria-hidden="true">
          <span className="smallcaps">
            Awaiting
            <br />
            stamp
          </span>
        </span>
      )}
      <span className="smallcaps text-ink-soft/60">
        Nº {country.code}-{String(hashCode(country.code) % 10000).padStart(4, '0')}
      </span>
    </aside>
  );
}

export default {
  id: 'atlas',
  name: 'Atlas',
  tagline: 'Heirloom expedition atlas',
  swatch: ['#f6f1e7', '#3e5f45', '#c9a227'],
  pageColor: '#f6f1e7',
  Logo: AtlasLogo,
  // The passport stamp in the ticket stub IS the visited mark — no inline one.
  VisitedMark: null,
  CountryStub: AtlasCountryStub,
  map: { dots: false },
  unlock: null,
};
