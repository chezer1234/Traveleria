import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserScore, getUserCountries, removeUserCountry } from '../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [scoreData, countriesData] = await Promise.all([
        getUserScore(user.id),
        getUserCountries(user.id),
      ]);
      setScore(scoreData);
      setCountries(countriesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveCountry(code, name) {
    if (!confirm(`Remove ${name} from your visited countries? This will also remove all city visits.`)) {
      return;
    }
    setRemoving(code);
    try {
      await removeUserCountry(user.id, code);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading your travel data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      </div>
    );
  }

  const totalPoints = score ? Math.round(score.totalPoints * 10) / 10 : 0;
  const countryCount = countries.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Score header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Your Travel Points</p>
        <p className="text-5xl font-bold text-indigo-600">{totalPoints.toLocaleString()}</p>
        <p className="text-gray-500 mt-2">
          {countryCount} {countryCount === 1 ? 'country' : 'countries'} visited
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Visited Countries</h2>
        <Link
          to="/add-countries"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Countries
        </Link>
      </div>

      {/* Countries list */}
      {countries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">You haven't logged any countries yet.</p>
          <Link
            to="/add-countries"
            className="text-indigo-600 font-medium hover:underline"
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
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      to={`/countries/${c.country_code}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {c.country_name}
                    </Link>
                    <span className="text-xs text-gray-400">{c.region}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{Math.round(c.total * 10) / 10} pts</span>
                    <span>Baseline: {Math.round(c.baseline * 10) / 10}</span>
                    <span>{c.cities_visited} {c.cities_visited === 1 ? 'city' : 'cities'}</span>
                  </div>
                  {/* Exploration bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(explored, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{explored}% explored</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveCountry(c.country_code, c.country_name)}
                  disabled={removing === c.country_code}
                  className="ml-4 text-sm text-gray-400 hover:text-red-600 disabled:opacity-50"
                  title="Remove country"
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
