import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { removeCountryOptimistic } from '../lib/mutations';
import { getUserScoreLocal, getUserCountriesLocal } from '../lib/queries';

export default function Dashboard() {
  const { user, db, dbStatus } = useAuth();
  const homeCountry = user.home_country;
  const [score, setScore] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [scoreData, countriesData] = await Promise.all([
        getUserScoreLocal(db, user.id, homeCountry),
        getUserCountriesLocal(db, user.id, homeCountry),
      ]);
      setScore(scoreData);
      setCountries(countriesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id, homeCountry]);

  useEffect(() => {
    if (dbStatus === 'ready') loadData();
  }, [dbStatus, loadData]);

  async function handleRemoveCountry(code, name) {
    if (!confirm(`Remove ${name} from your visited countries? This will also remove all city visits.`)) {
      return;
    }
    setRemoving(code);
    try {
      // Optimistic: the local DELETE runs inside the savepoint before the
      // network call, so loadData() below sees the row already gone. On
      // network failure the savepoint rolls back and the row reappears.
      await removeCountryOptimistic(db, user.id, code);
      await loadData();
    } catch (err) {
      setError(err.message);
      await loadData();
    } finally {
      setRemoving(null);
    }
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-ink-soft text-sm">Loading your travel data...</p>
      </div>
    );
  }

  if (error && countries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="ml-4 text-red-700 underline hover:no-underline text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalPoints = score ? Math.round(score.totalPoints * 10) / 10 : 0;
  const countryCount = countries.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Score header */}
      <div className="plate rounded-lg p-6 sm:p-8 mb-8">
        <div className="border-l-2 border-gold pl-4">
          <p className="smallcaps text-ink-soft mb-1">Your Travel Points</p>
          <p className="text-4xl sm:text-5xl font-display font-black tabular-nums text-ink">{totalPoints.toLocaleString()}</p>
          <p className="text-ink-soft mt-2">
            {countryCount} {countryCount === 1 ? 'country' : 'countries'} visited
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-bold text-ink">Visited Countries</h2>
        <Link
          to="/add-countries"
          className="bg-compass text-paper px-4 py-2 rounded-md text-sm font-medium hover:bg-compass-deep"
        >
          + Add Countries
        </Link>
      </div>

      {/* Countries list */}
      {countries.length === 0 ? (
        <div className="bg-panel border border-hairline rounded-lg p-12 text-center">
          <p className="text-ink-soft mb-4">You haven't logged any countries yet.</p>
          <Link
            to="/add-countries"
            className="text-compass font-medium hover:underline"
          >
            Start adding countries
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {countries.map((c) => {
            const explored = Math.round((c.explored || 0) * 100);
            return (
              <div
                key={c.country_code}
                className="bg-panel border border-hairline rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      to={`/countries/${c.country_code}`}
                      className="font-medium text-ink hover:text-compass"
                    >
                      {c.country_name}
                    </Link>
                    <span className="text-xs text-ink-soft/70">{c.region}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                    <span className="tabular-nums">{Math.round(c.total * 10) / 10} pts</span>
                    <span className="hidden sm:inline tabular-nums">Baseline: {Math.round(c.baseline * 10) / 10}</span>
                    {c.provinces_visited > 0 && (
                      <span>{c.provinces_visited} {c.provinces_visited === 1 ? 'province' : 'provinces'}</span>
                    )}
                    <span>{c.cities_visited} {c.cities_visited === 1 ? 'city' : 'cities'}</span>
                  </div>
                  {/* Exploration bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-parchment rounded-full h-1.5 max-w-xs" role="progressbar" aria-valuenow={explored} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.country_name} exploration`}>
                      <div
                        className="bg-atlas h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(explored, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-soft">{explored}% explored</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveCountry(c.country_code, c.country_name)}
                  disabled={removing === c.country_code}
                  className="ml-2 p-2.5 text-sm text-ink-soft/70 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Remove ${c.country_name}`}
                >
                  {removing === c.country_code ? '...' : 'Remove'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
