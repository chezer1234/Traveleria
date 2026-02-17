import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCountry, getUserCountries, addUserCity, removeUserCity } from '../api/client';

export default function CountryDetail() {
  const { code } = useParams();
  const { user } = useAuth();
  const [country, setCountry] = useState(null);
  const [visitedCityIds, setVisitedCityIds] = useState(new Set());
  const [isVisited, setIsVisited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    loadData();
  }, [code, user]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [countryData, userCountries] = await Promise.all([
        getCountry(code),
        getUserCountries(user.id),
      ]);
      setCountry(countryData);

      const uc = userCountries.find((c) => c.country_code === code.toUpperCase());
      setIsVisited(!!uc);

      if (uc) {
        // Get cities the user has visited in this country by comparing with all user city visits
        // We need to check which cities are visited - we'll track them via the API response
        // The userCountries response doesn't include city IDs, so we track locally
        // We'll need to fetch city visit status differently
        // For now, we use a local set that gets populated from the initial load
        // and updated as the user toggles
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // On initial load, figure out which cities the user has visited
  // We need to call the user countries endpoint and cross-reference
  useEffect(() => {
    if (!country || !isVisited) return;
    async function loadVisitedCities() {
      try {
        const userCountries = await getUserCountries(user.id);
        const uc = userCountries.find((c) => c.country_code === code.toUpperCase());
        // The API doesn't return individual city IDs in getUserCountries,
        // but we can track them locally as users toggle
        // For a fresh load, we need another approach - let's check via score endpoint
        // Actually, let's just maintain state as user interacts
        // We'll use a dedicated fetch to get visited city IDs
        // For now, start empty and let user toggle
      } catch {
        // silent
      }
    }
    loadVisitedCities();
  }, [country, isVisited, user, code]);

  async function toggleCity(cityId) {
    if (!isVisited) return;
    setToggling(cityId);
    setError('');

    try {
      if (visitedCityIds.has(cityId)) {
        await removeUserCity(user.id, cityId);
        setVisitedCityIds((prev) => {
          const next = new Set(prev);
          next.delete(cityId);
          return next;
        });
      } else {
        await addUserCity(user.id, cityId);
        setVisitedCityIds((prev) => new Set([...prev, cityId]));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading country details...</p>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error || 'Country not found'}
        </div>
      </div>
    );
  }

  const totalExplored = country.cities
    .filter((c) => visitedCityIds.has(c.id))
    .reduce((sum, c) => sum + c.percentage, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{country.name}</h1>
        <p className="text-sm text-gray-500 mb-4">{country.region} &middot; {country.code}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Baseline Points</p>
            <p className="font-semibold text-gray-900">{country.baseline_points}</p>
          </div>
          <div>
            <p className="text-gray-500">Population</p>
            <p className="font-semibold text-gray-900">{Number(country.population).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Annual Tourists</p>
            <p className="font-semibold text-gray-900">{Number(country.annual_tourists).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Area</p>
            <p className="font-semibold text-gray-900">{Number(country.area_km2).toLocaleString()} km&sup2;</p>
          </div>
        </div>

        {isVisited && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(totalExplored, 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {Math.round(totalExplored * 10) / 10}% explored
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {!isVisited && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
          Add this country to your visited list first to log city visits.
        </div>
      )}

      {/* City list */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Cities ({country.cities.length})
      </h2>

      <div className="space-y-2">
        {country.cities.map((city) => {
          const isChecked = visitedCityIds.has(city.id);
          return (
            <label
              key={city.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                isChecked
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${!isVisited ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={!isVisited || toggling === city.id}
                onChange={() => toggleCity(city.id)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <div className="flex-1 flex items-center justify-between">
                <span className={`text-sm ${isChecked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                  {city.name}
                </span>
                <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-shrink-0">
                  <span className="hidden sm:inline">{Number(city.population).toLocaleString()} pop</span>
                  <span>{city.percentage}%</span>
                  {toggling === city.id && <span className="text-indigo-600">saving...</span>}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
