import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import {
  getUserScoreLocal,
  getUserCountriesLocal,
  getCountriesLocal,
  getUserVisitedProvinceCodesLocal,
  getUserVisitedCityNamesLocal,
} from '../lib/queries';
import { GEO_URL, getAlpha2 } from '../lib/geo';
import EuropeProvinceMap from '../components/EuropeProvinceMap';

const EUROPE_COUNTRY_CODES = new Set([
  'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
  'HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO',
  'PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA',
]);

// Approximate coordinates [lng, lat] for European cities in our seed data.
// Used to place city markers in the Europe cities view.
const EUROPE_CITY_COORDS = {
  GB: {
    'London': [-0.1278, 51.5074], 'Birmingham': [-1.8904, 52.4862],
    'Manchester': [-2.2426, 53.4808], 'Glasgow': [-4.2518, 55.8642],
    'Liverpool': [-2.9916, 53.4084], 'Edinburgh': [-3.1883, 55.9533],
    'Leeds': [-1.5491, 53.8008], 'Bristol': [-2.5879, 51.4545],
    'Cardiff': [-3.1791, 51.4816], 'Belfast': [-5.9301, 54.5973],
    'Sheffield': [-1.4701, 53.3811], 'Newcastle': [-1.6174, 54.9783],
    'Nottingham': [-1.1581, 52.9548], 'Oxford': [-1.2577, 51.7520],
    'Cambridge': [0.1218, 52.2053],
  },
  FR: {
    'Paris': [2.3522, 48.8566], 'Marseille': [5.3698, 43.2965],
    'Lyon': [4.8357, 45.7640], 'Toulouse': [1.4442, 43.6047],
    'Nice': [7.2620, 43.7102], 'Nantes': [-1.5534, 47.2184],
    'Strasbourg': [7.7521, 48.5734], 'Montpellier': [3.8767, 43.6108],
    'Bordeaux': [-0.5792, 44.8378], 'Lille': [3.0573, 50.6292],
    'Rennes': [-1.6778, 48.1173], 'Reims': [4.0317, 49.2583],
  },
  DE: {
    'Berlin': [13.4050, 52.5200], 'Hamburg': [9.9937, 53.5753],
    'Munich': [11.5820, 48.1351], 'Cologne': [6.9603, 50.9333],
    'Frankfurt': [8.6821, 50.1109], 'Stuttgart': [9.1800, 48.7758],
    'Dusseldorf': [6.7735, 51.2217], 'Leipzig': [12.3731, 51.3397],
    'Dortmund': [7.4653, 51.5136], 'Essen': [7.0148, 51.4556],
    'Bremen': [8.8017, 53.0793], 'Dresden': [13.7372, 51.0504],
    'Hanover': [9.7320, 52.3759], 'Nuremberg': [11.0767, 49.4521],
  },
  IT: {
    'Rome': [12.4964, 41.9028], 'Milan': [9.1900, 45.4654],
    'Naples': [14.2681, 40.8518], 'Turin': [7.6869, 45.0703],
    'Palermo': [13.3615, 38.1157], 'Genoa': [8.9463, 44.4056],
    'Bologna': [11.3426, 44.4949], 'Florence': [11.2558, 43.7696],
    'Venice': [12.3155, 45.4408], 'Verona': [10.9916, 45.4384],
  },
  ES: {
    'Madrid': [-3.7038, 40.4168], 'Barcelona': [2.1734, 41.3851],
    'Valencia': [-0.3763, 39.4699], 'Seville': [-5.9845, 37.3891],
    'Zaragoza': [-0.8773, 41.6488], 'Malaga': [-4.4214, 36.7213],
    'Bilbao': [-2.9253, 43.2630], 'Las Palmas': [-15.4148, 28.1235],
    'Palma de Mallorca': [2.6502, 39.5696], 'Granada': [-3.5986, 37.1773],
  },
  AT: {
    'Vienna': [16.3738, 48.2082], 'Graz': [15.4395, 47.0707],
    'Linz': [14.2858, 48.3069], 'Salzburg': [13.0550, 47.8095],
    'Innsbruck': [11.3928, 47.2692], 'Klagenfurt': [14.3054, 46.6228],
    'Villach': [13.8558, 46.6111],
  },
  NL: {
    'Amsterdam': [4.9041, 52.3676], 'Rotterdam': [4.4777, 51.9244],
    'The Hague': [4.3007, 52.0705], 'Utrecht': [5.1214, 52.0907],
    'Eindhoven': [5.4785, 51.4416], 'Groningen': [6.5665, 53.2194],
    'Tilburg': [5.0919, 51.5555], 'Almere': [5.2647, 52.3508],
    'Breda': [4.7768, 51.5719], 'Maastricht': [5.6909, 50.8514],
  },
  CZ: {
    'Prague': [14.4378, 50.0755], 'Brno': [16.6068, 49.1951],
    'Ostrava': [18.2625, 49.8209], 'Plzeň': [13.3884, 49.7384],
    'Liberec': [15.0543, 50.7663], 'Olomouc': [17.2509, 49.5938],
    'České Budějovice': [14.4747, 48.9745], 'Hradec Králové': [15.8327, 50.2092],
    'Karlovy Vary': [12.8707, 50.2314],
  },
  RO: {
    'Bucharest': [26.0963, 44.4268], 'Cluj-Napoca': [23.5964, 46.7712],
    'Timișoara': [21.2087, 45.7489], 'Iași': [27.5849, 47.1585],
    'Constanța': [28.6499, 44.1766], 'Craiova': [23.7946, 44.3302],
    'Brașov': [25.5887, 45.6580], 'Galați': [28.0455, 45.4353],
    'Sibiu': [24.1503, 45.7983], 'Sinaia': [25.5484, 45.3489],
  },
  RU: {
    'Moscow': [37.6176, 55.7558], 'Saint Petersburg': [30.3158, 59.9391],
  },
  PL: {
    'Warsaw': [21.0122, 52.2297], 'Kraków': [19.9450, 50.0647],
    'Łódź': [19.4559, 51.7592], 'Wrocław': [17.0385, 51.1079],
    'Poznań': [16.9252, 52.4064],
  },
  BE: {
    'Brussels': [4.3517, 50.8503], 'Ghent': [3.7174, 51.0543],
    'Antwerp': [4.4025, 51.2194], 'Bruges': [3.2247, 51.2093],
  },
  SE: {
    'Stockholm': [18.0686, 59.3293], 'Gothenburg': [11.9746, 57.7089],
    'Malmö': [13.0038, 55.6050],
  },
  NO: {
    'Oslo': [10.7522, 59.9139], 'Bergen': [5.3221, 60.3913],
  },
  DK: {
    'Copenhagen': [12.5683, 55.6761], 'Aarhus': [10.2039, 56.1629],
  },
  FI: {
    'Helsinki': [24.9384, 60.1699], 'Tampere': [23.7871, 61.4978],
  },
  PT: {
    'Lisbon': [-9.1393, 38.7223], 'Porto': [-8.6291, 41.1579],
  },
  CH: {
    'Zurich': [8.5417, 47.3769], 'Geneva': [6.1432, 46.2044],
    'Basel': [7.5886, 47.5596],
  },
  HU: {
    'Budapest': [19.0402, 47.4979], 'Debrecen': [21.6244, 47.5316],
  },
  GR: {
    'Athens': [23.7275, 37.9838], 'Thessaloniki': [22.9444, 40.6401],
  },
  IE: {
    'Dublin': [-6.2603, 53.3498], 'Cork': [-8.4756, 51.8985],
  },
};

function formatPopulation(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

export default function Map() {
  const { user, db, dbStatus } = useAuth();
  const navigate = useNavigate();
  const homeCountry = user.home_country;

  const [userCountries, setUserCountries] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [score, setScore] = useState(null);
  const [visitedProvinceCodes, setVisitedProvinceCodes] = useState(new Set());
  const [visitedCityNames, setVisitedCityNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('my');
  const [europeMode, setEuropeMode] = useState('countries'); // 'countries' | 'provinces' | 'cities'
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dbStatus !== 'ready' || !db) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [scoreData, countriesData, allCountriesData, provinceCodes, cityNames] = await Promise.all([
          getUserScoreLocal(db, user.id, homeCountry),
          getUserCountriesLocal(db, user.id, homeCountry),
          getCountriesLocal(db, homeCountry),
          getUserVisitedProvinceCodesLocal(db, user.id),
          getUserVisitedCityNamesLocal(db, user.id),
        ]);
        if (cancelled) return;
        setScore(scoreData);
        setUserCountries(countriesData);
        setAllCountries(allCountriesData);
        setVisitedProvinceCodes(provinceCodes);
        setVisitedCityNames(cityNames);
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

  // Stats for My Map
  const continentsVisited = new Set(userCountries.map(c => c.region)).size;
  const subregionsVisited = new Set(userCountries.filter(c => c.subregion).map(c => c.subregion)).size;
  const totalCitiesVisited = userCountries.reduce((sum, c) => sum + (c.cities_visited || 0), 0);
  const totalPopulation = userCountries.reduce((sum, c) => sum + Number(c.population || 0), 0);

  // Visited European cities with known coordinates for marker rendering
  const europeCityMarkers = visitedCityNames
    .filter(c => EUROPE_COUNTRY_CODES.has(c.country_code))
    .flatMap(c => {
      const coords = EUROPE_CITY_COORDS[c.country_code]?.[c.name];
      if (!coords) return [];
      return [{ name: c.name, country_code: c.country_code, coords }];
    });

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  function handleCountryClick(geo) {
    const code = getAlpha2(geo);
    if (code) navigate(`/countries/${code}`);
  }

  function handleCountryEnter(geo) {
    const code = getAlpha2(geo);
    const name = geo.properties.name;
    if (view === 'my' && visitedCodes.has(code)) {
      const data = visitedLookup[code];
      const pts = data ? Math.round(data.total * 10) / 10 : 0;
      setTooltip(`${name} — ${pts} pts`);
    } else if (view === 'europe') {
      const isVisited = visitedCodes.has(code);
      setTooltip(isVisited ? `${name} ✓` : (name || ''));
    } else {
      setTooltip(name || '');
    }
  }

  // Fills reference the theme tokens (issue #60) so the map follows the
  // selected style. Explore mode and out-of-scope countries are tints mixed
  // from the tokens rather than extra palette entries.
  const FILL = {
    visited: 'var(--color-atlas)',
    visitedHover: 'var(--color-atlas-deep)',
    unvisited: 'var(--color-parchment)',
    unvisitedHover: 'var(--color-parchment-deep)',
    explore: 'color-mix(in srgb, var(--color-compass) 30%, var(--color-paper))',
    exploreHover: 'color-mix(in srgb, var(--color-compass) 45%, var(--color-paper))',
    outOfScope: 'color-mix(in srgb, var(--color-parchment) 45%, var(--color-paper))',
  };

  function getFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return FILL.explore;
    if (view === 'europe') {
      if (!EUROPE_COUNTRY_CODES.has(code)) return FILL.outOfScope;
      return visitedCodes.has(code) ? FILL.visited : FILL.unvisited;
    }
    return visitedCodes.has(code) ? FILL.visited : FILL.unvisited;
  }

  function getHoverFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return FILL.exploreHover;
    if (view === 'europe') {
      if (!EUROPE_COUNTRY_CODES.has(code)) return FILL.outOfScope;
      return visitedCodes.has(code) ? FILL.visitedHover : FILL.unvisitedHover;
    }
    return visitedCodes.has(code) ? FILL.visitedHover : FILL.unvisitedHover;
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="loading-spinner mx-auto" aria-hidden="true" />
        <p className="mt-4 text-ink-soft">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          {error}
          <button onClick={() => window.location.reload()} className="ml-4 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">World Map</h1>
        <div className="flex flex-wrap gap-1 bg-panel border border-hairline rounded-md p-1">
          {[
            { key: 'my', label: 'My Map' },
            { key: 'europe', label: 'Europe' },
            { key: 'explore', label: 'Explore' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-2.5 rounded-md smallcaps transition-colors ${
                view === key
                  ? 'bg-ink text-paper'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar — My Map view (ledger tiles) */}
      {view === 'my' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-hairline border border-hairline rounded-lg overflow-hidden mb-6">
          {[
            { label: 'Countries', value: userCountries.length, to: '/dashboard' },
            { label: 'Continents', value: continentsVisited },
            { label: 'Sub-regions', value: subregionsVisited, to: '/subregions' },
            { label: 'Cities', value: totalCitiesVisited },
            { label: 'Population visited', value: formatPopulation(totalPopulation) },
          ].map(({ label, value, to }) => {
            const body = (
              <>
                <p className="smallcaps text-ink-soft">{label}</p>
                <p className="font-display font-black text-2xl sm:text-3xl tabular-nums text-ink mt-1">{value}</p>
              </>
            );
            return to ? (
              <Link key={label} to={to} className="bg-panel p-4 block hover:bg-paper transition-colors">
                {body}
              </Link>
            ) : (
              <div key={label} className="bg-panel p-4">{body}</div>
            );
          })}
          <Link to="/dashboard" className="bg-paper p-4 border-l-2 border-gold block hover:bg-panel transition-colors">
            <p className="smallcaps text-ink">Total Points</p>
            <p className="font-display font-black text-2xl sm:text-3xl tabular-nums text-ink mt-1">
              {score ? Math.round(score.totalPoints).toLocaleString() : 0}
            </p>
          </Link>
        </div>
      )}

      {/* Europe mode selector */}
      {view === 'europe' && (
        <div className="bg-panel border border-hairline rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="smallcaps text-ink-soft shrink-0">View mode:</p>
          <div className="flex flex-wrap gap-1 bg-panel border border-hairline rounded-md p-1">
            {[
              { key: 'countries', label: 'Countries visited' },
              { key: 'provinces', label: 'Provinces visited' },
              { key: 'cities', label: 'Cities' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setEuropeMode(key)}
                className={`px-3 py-2.5 rounded-md smallcaps transition-colors ${
                  europeMode === key
                    ? 'bg-ink text-paper'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'explore' && (
        <div className="bg-panel border border-hairline rounded-lg p-4 mb-6">
          <p className="text-sm text-ink">
            Click any country to see its details, cities, and points.
          </p>
        </div>
      )}

      {/* Provinces mode — D3-rendered province map for European Tier 2 countries */}
      {view === 'europe' && europeMode === 'provinces' ? (
        <EuropeProvinceMap visitedProvinceCodes={visitedProvinceCodes} />
      ) : (
        /* World map (react-simple-maps) — used for all other modes */
        <div
          className="plate rounded-lg relative"
          onMouseMove={handleMouseMove}
        >
          {/* Cartouche header */}
          <div className="text-center px-5 pt-4 pb-3 border-b border-hairline">
            <p className="font-display font-bold text-base sm:text-lg tracking-[0.06em] text-ink uppercase">
              Plate Nº I — The Known World
            </p>
            <p className="smallcaps text-ink-soft mt-0.5">
              Logged: {userCountries.length} {userCountries.length === 1 ? 'nation' : 'nations'} across {continentsVisited} {continentsVisited === 1 ? 'continent' : 'continents'}
            </p>
            <span className="block text-gold text-xs tracking-[0.4em] mt-1" aria-hidden="true">✦ ✦ ✦</span>
          </div>
          <div className="p-2 sm:p-4">
          <ComposableMap
            projectionConfig={
              view === 'europe'
                ? { rotate: [-15, 0, 0], scale: 600, center: [15, 55] }
                : { rotate: [-10, 0, 0], scale: 147 }
            }
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
                          stroke: 'var(--color-paper)',
                          strokeWidth: 0.5,
                          outline: 'none',
                        },
                        hover: {
                          fill: getHoverFill(geo),
                          stroke: 'var(--color-paper)',
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

              {/* City markers — shown in Europe cities mode */}
              {view === 'europe' && europeMode === 'cities' && europeCityMarkers.map(({ name, country_code, coords }) => (
                <Marker key={`${country_code}-${name}`} coordinates={coords}>
                  <circle
                    r={5}
                    strokeWidth={1.5}
                    style={{ cursor: 'pointer', fill: 'var(--color-compass)', stroke: 'var(--color-paper)' }}
                    onClick={() => navigate(`/countries/${country_code}`)}
                    onMouseEnter={() => setTooltip(`${name} (${country_code})`)}
                    onMouseLeave={() => setTooltip('')}
                  />
                </Marker>
              ))}
            </ZoomableGroup>
          </ComposableMap>
          </div>

          {tooltip && (
            <div
              className="fixed bg-ink text-paper text-xs px-2 py-1 rounded pointer-events-none z-50"
              style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
            >
              {tooltip}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {view === 'my' && (
        <div className="flex flex-wrap gap-4 mt-4 smallcaps text-ink-soft">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-atlas inline-block" />
            Visited
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-parchment border border-hairline inline-block" />
            Not visited
          </div>
        </div>
      )}

      {/* Cities panel — list of cities with coordinates */}
      {view === 'europe' && europeMode === 'cities' && (
        <div className="mt-4 bg-panel border border-hairline rounded-lg p-4">
          <h3 className="text-sm font-semibold text-ink mb-3">Cities visited in Europe</h3>
          {europeCityMarkers.length === 0 ? (
            <p className="text-sm text-ink-soft">No European cities logged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {europeCityMarkers.map(({ name, country_code }) => (
                <span
                  key={`${country_code}-${name}`}
                  className="bg-compass/10 text-ink border border-compass/40 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-soft/70 mt-3">
            Blue pins show your visited cities. Click any pin to view the country.
          </p>
        </div>
      )}
    </div>
  );
}
