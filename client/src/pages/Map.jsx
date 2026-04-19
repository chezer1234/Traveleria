import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { getUserScoreLocal, getUserCountriesLocal } from '../lib/queries';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO 3166-1 numeric → alpha-2 mapping (world-atlas uses numeric IDs, our DB uses alpha-2)
const NUM_TO_ALPHA2 = {
  '004':'AF','008':'AL','012':'DZ','020':'AD','024':'AO','028':'AG','032':'AR','036':'AU',
  '040':'AT','044':'BS','048':'BH','050':'BD','051':'AM','052':'BB','056':'BE','060':'BM',
  '064':'BT','068':'BO','070':'BA','072':'BW','076':'BR','084':'BZ','090':'SB','096':'BN',
  '100':'BG','104':'MM','108':'BI','112':'BY','116':'KH','120':'CM','124':'CA','132':'CV',
  '140':'CF','144':'LK','148':'TD','152':'CL','156':'CN','158':'TW','170':'CO','174':'KM',
  '178':'CG','180':'CD','188':'CR','191':'HR','192':'CU','196':'CY','203':'CZ','204':'BJ',
  '208':'DK','214':'DO','218':'EC','222':'SV','226':'GQ','231':'ET','232':'ER','233':'EE',
  '242':'FJ','246':'FI','250':'FR','258':'PF','262':'DJ','266':'GA','268':'GE','270':'GM',
  '275':'PS','276':'DE','288':'GH','300':'GR','308':'GD','320':'GT','324':'GN','328':'GY',
  '332':'HT','340':'HN','348':'HU','352':'IS','356':'IN','360':'ID','364':'IR','368':'IQ',
  '372':'IE','376':'IL','380':'IT','384':'CI','388':'JM','392':'JP','398':'KZ','400':'JO',
  '404':'KE','408':'KP','410':'KR','414':'KW','417':'KG','418':'LA','422':'LB','426':'LS',
  '428':'LV','430':'LR','434':'LY','440':'LT','442':'LU','450':'MG','454':'MW','458':'MY',
  '462':'MV','466':'ML','470':'MT','478':'MR','480':'MU','484':'MX','496':'MN','498':'MD',
  '499':'ME','504':'MA','508':'MZ','512':'OM','516':'NA','520':'NR','524':'NP','528':'NL',
  '540':'NC','548':'VU','554':'NZ','558':'NI','562':'NE','566':'NG','578':'NO','586':'PK',
  '591':'PA','598':'PG','600':'PY','604':'PE','608':'PH','616':'PL','620':'PT','624':'GW',
  '626':'TL','630':'PR','634':'QA','642':'RO','643':'RU','646':'RW','682':'SA','686':'SN',
  '688':'RS','694':'SL','702':'SG','703':'SK','704':'VN','705':'SI','706':'SO','710':'ZA',
  '716':'ZW','724':'ES','728':'SS','729':'SD','740':'SR','748':'SZ','752':'SE','756':'CH',
  '760':'SY','762':'TJ','764':'TH','768':'TG','776':'TO','780':'TT','784':'AE','788':'TN',
  '792':'TR','795':'TM','798':'TV','800':'UG','804':'UA','807':'MK','818':'EG','826':'GB',
  '834':'TZ','840':'US','854':'BF','858':'UY','860':'UZ','862':'VE','887':'YE','894':'ZM',
  '732':'EH','736':'SD',
};

function getAlpha2(geo) {
  return NUM_TO_ALPHA2[geo.id] || null;
}

export default function Map() {
  const { user, db, dbStatus } = useAuth();
  const navigate = useNavigate();
  const homeCountry = user.home_country;

  const [userCountries, setUserCountries] = useState([]);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('my');
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dbStatus !== 'ready' || !db) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [scoreData, countriesData] = await Promise.all([
          getUserScoreLocal(db, user.id, homeCountry),
          getUserCountriesLocal(db, user.id, homeCountry),
        ]);
        if (cancelled) return;
        setScore(scoreData);
        setUserCountries(countriesData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [db, dbStatus, user.id, homeCountry]);

  const visitedCodes = new Set(userCountries.map(c => c.country_code));
  const visitedLookup = Object.fromEntries(userCountries.map(c => [c.country_code, c]));

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  function handleCountryClick(geo) {
    const code = getAlpha2(geo);
    if (code) {
      navigate(`/countries/${code}`);
    }
  }

  function handleCountryEnter(geo) {
    const code = getAlpha2(geo);
    const name = geo.properties.name;
    if (view === 'my' && visitedCodes.has(code)) {
      const data = visitedLookup[code];
      const pts = data ? Math.round(data.total * 10) / 10 : 0;
      setTooltip(`${name} — ${pts} pts`);
    } else {
      setTooltip(name || '');
    }
  }

  function getFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return '#a5b4fc'; // indigo-300
    return visitedCodes.has(code) ? '#22c55e' : '#d1d5db'; // green-500 / gray-300
  }

  function getHoverFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return '#818cf8'; // indigo-400
    return visitedCodes.has(code) ? '#16a34a' : '#9ca3af'; // green-600 / gray-400
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button onClick={() => window.location.reload()} className="ml-4 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">World Map</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('my')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'my'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Map
          </button>
          <button
            onClick={() => setView('explore')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'explore'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Explore
          </button>
        </div>
      </div>

      {/* Stats bar — only in My Map view */}
      {view === 'my' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex gap-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Countries Visited</p>
            <p className="text-2xl font-bold text-gray-900">{userCountries.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Points</p>
            <p className="text-2xl font-bold text-indigo-600">
              {score ? Math.round(score.totalPoints).toLocaleString() : 0}
            </p>
          </div>
        </div>
      )}

      {view === 'explore' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <p className="text-sm text-gray-500">
            Click any country to see its details, cities, and points.
          </p>
        </div>
      )}

      {/* Map */}
      <div
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 sm:p-4 relative"
        onMouseMove={handleMouseMove}
      >
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          style={{ width: '100%', height: 'auto' }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(geo)}
                    onMouseEnter={() => handleCountryEnter(geo)}
                    onMouseLeave={() => setTooltip('')}
                    style={{
                      default: {
                        fill: getFill(geo),
                        stroke: '#fff',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: getHoverFill(geo),
                        stroke: '#fff',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: 'pointer',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-50"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Legend — only in My Map view */}
      {view === 'my' && (
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
            Visited
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" />
            Not visited
          </div>
        </div>
      )}
    </div>
  );
}
