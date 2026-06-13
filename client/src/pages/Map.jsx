import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { useAuth } from '../context/AuthContext';
import { getUserScoreLocal, getUserCountriesLocal } from '../lib/queries';
import { GEO_URL, getAlpha2 } from '../lib/geo';

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
