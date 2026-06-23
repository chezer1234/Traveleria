import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { getUserScoreLocal, getUserCountriesLocal, getCountriesLocal } from '../lib/queries';
import { GEO_URL, getAlpha2 } from '../lib/geo';

const EUROPE_SUBREGION_COLORS = {
  'Northern Europe': { fill: '#60a5fa', hover: '#3b82f6' },   // blue
  'Western Europe':  { fill: '#34d399', hover: '#10b981' },   // green
  'Southern Europe': { fill: '#fbbf24', hover: '#f59e0b' },   // yellow
  'Eastern Europe':  { fill: '#f87171', hover: '#ef4444' },   // red
};

const EUROPE_COUNTRY_CODES = new Set([
  'AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR',
  'HU','IS','IE','IT','XK','LV','LI','LT','LU','MT','MD','MC','ME','NL','MK','NO',
  'PL','PT','RO','RU','SM','RS','SK','SI','ES','SE','CH','UA','GB','VA',
]);

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('my');
  const [europeMode, setEuropeMode] = useState('countries'); // 'countries' | 'subregions' | 'cities'
  const [tooltip, setTooltip] = useState('');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (dbStatus !== 'ready' || !db) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [scoreData, countriesData, allCountriesData] = await Promise.all([
          getUserScoreLocal(db, user.id, homeCountry),
          getUserCountriesLocal(db, user.id, homeCountry),
          getCountriesLocal(db, homeCountry),
        ]);
        if (cancelled) return;
        setScore(scoreData);
        setUserCountries(countriesData);
        setAllCountries(allCountriesData);
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
  const subregionLookup = Object.fromEntries(allCountries.map(c => [c.code, c]));

  // Stats for My Map
  const continentsVisited = new Set(userCountries.map(c => c.region)).size;
  const subregionsVisited = new Set(userCountries.filter(c => c.subregion).map(c => c.subregion)).size;
  const totalCitiesVisited = userCountries.reduce((sum, c) => sum + (c.cities_visited || 0), 0);
  const totalPopulation = userCountries.reduce((sum, c) => sum + Number(c.population || 0), 0);

  // Visited European cities list (for Europe city mode)
  const visitedEuropeanCities = userCountries
    .filter(c => EUROPE_COUNTRY_CODES.has(c.country_code) && (c.cities_visited || 0) > 0)
    .map(c => ({ country: c.country_name, count: c.cities_visited }));

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

  function getFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return '#a5b4fc';
    if (view === 'europe') {
      if (!EUROPE_COUNTRY_CODES.has(code)) return '#e5e7eb';
      if (europeMode === 'countries') {
        return visitedCodes.has(code) ? '#22c55e' : '#d1d5db';
      }
      if (europeMode === 'subregions') {
        const country = subregionLookup[code];
        const sr = country?.subregion;
        const color = EUROPE_SUBREGION_COLORS[sr];
        if (color) return visitedCodes.has(code) ? color.fill : color.fill + '88';
        return '#d1d5db';
      }
      if (europeMode === 'cities') {
        const c = visitedLookup[code];
        if (c && c.cities_visited > 0) return '#6366f1';
        return visitedCodes.has(code) ? '#a5b4fc' : '#d1d5db';
      }
    }
    return visitedCodes.has(code) ? '#22c55e' : '#d1d5db';
  }

  function getHoverFill(geo) {
    const code = getAlpha2(geo);
    if (view === 'explore') return '#818cf8';
    if (view === 'europe') {
      if (!EUROPE_COUNTRY_CODES.has(code)) return '#e5e7eb';
      if (europeMode === 'subregions') {
        const country = subregionLookup[code];
        const sr = country?.subregion;
        const color = EUROPE_SUBREGION_COLORS[sr];
        return color ? color.hover : '#9ca3af';
      }
      return visitedCodes.has(code) ? '#16a34a' : '#9ca3af';
    }
    return visitedCodes.has(code) ? '#16a34a' : '#9ca3af';
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
          <button onClick={() => window.location.reload()} className="ml-4 underline">Retry</button>
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
          {[
            { key: 'my', label: 'My Map' },
            { key: 'europe', label: 'Europe' },
            { key: 'explore', label: 'Explore' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar — My Map view */}
      {view === 'my' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Countries</p>
            <p className="text-2xl font-bold text-gray-900">{userCountries.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Continents</p>
            <p className="text-2xl font-bold text-gray-900">{continentsVisited}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Sub-regions</p>
            <p className="text-2xl font-bold text-gray-900">{subregionsVisited}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cities</p>
            <p className="text-2xl font-bold text-gray-900">{totalCitiesVisited}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Population visited</p>
            <p className="text-2xl font-bold text-indigo-600">{formatPopulation(totalPopulation)}</p>
          </div>
          <div className="col-span-2 sm:col-span-3 lg:col-span-5 border-t pt-3 mt-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Total Points</p>
            <p className="text-3xl font-bold text-indigo-600">
              {score ? Math.round(score.totalPoints).toLocaleString() : 0}
            </p>
          </div>
        </div>
      )}

      {/* Europe mode selector */}
      {view === 'europe' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-sm text-gray-500 shrink-0">View mode:</p>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'countries', label: 'Countries visited' },
              { key: 'subregions', label: 'Sub-regions' },
              { key: 'cities', label: 'Cities' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setEuropeMode(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  europeMode === key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
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

        {tooltip && (
          <div
            className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-50"
            style={{ left: mousePos.x + 12, top: mousePos.y - 28 }}
          >
            {tooltip}
          </div>
        )}
      </div>

      {/* Legend */}
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

      {view === 'europe' && europeMode === 'subregions' && (
        <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-600">
          {Object.entries(EUROPE_SUBREGION_COLORS).map(([name, colors]) => (
            <div key={name} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: colors.fill }} />
              {name}
            </div>
          ))}
          <div className="text-gray-400 ml-1">(faded = not yet visited)</div>
        </div>
      )}

      {view === 'europe' && europeMode === 'cities' && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Cities visited in Europe</h3>
          {visitedEuropeanCities.length === 0 ? (
            <p className="text-sm text-gray-500">No European cities logged yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visitedEuropeanCities.map(({ country, count }) => (
                <span
                  key={country}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1 text-xs font-medium"
                >
                  {country} ({count} {count === 1 ? 'city' : 'cities'})
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Countries highlighted in indigo have visited cities. Click any country to log more cities.
          </p>
        </div>
      )}
    </div>
  );
}
