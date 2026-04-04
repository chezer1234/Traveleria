import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCountry,
  getUserCountries,
  getUserProvinces,
  addUserCity,
  removeUserCity,
  addUserProvince,
  removeUserProvince,
} from '../api/client';
import ProvinceMap from '../components/ProvinceMap';
import ScoreBreakdown from '../components/ScoreBreakdown';

export default function CountryDetail() {
  const { code } = useParams();
  const { user } = useAuth();
  const homeCountry = user.home_country;
  const [country, setCountry] = useState(null);
  const [visitedCityIds, setVisitedCityIds] = useState(new Set());
  const [visitedProvinceCodes, setVisitedProvinceCodes] = useState(new Set());
  const [isVisited, setIsVisited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    loadData();
  }, [code, user.id, homeCountry]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [countryData, userCountries, userProvinces] = await Promise.all([
        getCountry(code, homeCountry),
        getUserCountries(user.id, homeCountry),
        getUserProvinces(user.id),
      ]);
      setCountry(countryData);

      const uc = userCountries.find((c) => c.country_code === code.toUpperCase());
      setIsVisited(!!uc);

      // Filter provinces for this country
      const provinceCodes = new Set(
        userProvinces
          .filter((p) => p.country_code === code.toUpperCase())
          .map((p) => p.code)
      );
      setVisitedProvinceCodes(provinceCodes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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

  async function toggleProvince(provinceCode) {
    if (!isVisited) return;
    setToggling(provinceCode);
    setError('');
    try {
      if (visitedProvinceCodes.has(provinceCode)) {
        await removeUserProvince(user.id, provinceCode);
        setVisitedProvinceCodes((prev) => {
          const next = new Set(prev);
          next.delete(provinceCode);
          return next;
        });
      } else {
        await addUserProvince(user.id, provinceCode);
        setVisitedProvinceCodes((prev) => new Set([...prev, provinceCode]));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-gray-500 text-sm">Loading country details...</p>
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

  const tier = country.tier;
  const hasProvinces = (tier === 1 || tier === 2) && country.provinces && country.provinces.length > 0;
  const showCities = tier === 1 || tier === 3 || tier === 'microstate';

  // Province exploration percentage
  const visitedProvincePoints = hasProvinces
    ? country.provinces
        .filter((p) => visitedProvinceCodes.has(p.code))
        .reduce((sum, p) => sum + p.maxPoints, 0)
    : 0;
  const totalProvincePoints = hasProvinces
    ? country.provinces.reduce((sum, p) => sum + p.maxPoints, 0)
    : 0;
  const provinceExplored = totalProvincePoints > 0 ? (visitedProvincePoints / totalProvincePoints) * 100 : 0;

  // City exploration for Tier 3
  const cityExplored = country.cities
    .filter((c) => visitedCityIds.has(c.id))
    .reduce((sum, c) => sum + c.percentage, 0);

  // Choose which exploration % to show
  const explored = hasProvinces ? provinceExplored : cityExplored;

  const tierLabel = tier === 'microstate' ? 'Microstate' : `Tier ${tier}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{country.name}</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {tierLabel}
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">{country.region} &middot; {country.code}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Base Points</p>
            <p className="font-semibold text-gray-900">{country.baseline_points}</p>
          </div>
          <div>
            <p className="text-gray-500">Explorer Bonus</p>
            <p className="font-semibold text-gray-900">up to {country.explorer_ceiling}</p>
          </div>
          <div>
            <p className="text-gray-500">Max Total</p>
            <p className="font-semibold text-gray-900">{Math.round((country.baseline_points + country.explorer_ceiling) * 10) / 10}</p>
          </div>
        </div>

        {isVisited && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-xs" role="progressbar" aria-valuenow={Math.round(explored * 10) / 10} aria-valuemin={0} aria-valuemax={100} aria-label="Country exploration">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(explored, 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {Math.round(explored * 10) / 10}% explored
              </span>
            </div>
          </div>
        )}
      </div>

      <ScoreBreakdown
        country={country}
        visitedProvinceCodes={visitedProvinceCodes}
        visitedCityIds={visitedCityIds}
      />

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {!isVisited && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
          Add this country to your visited list first to log visits.
        </div>
      )}

      {/* Province map for Tier 1 & 2 */}
      {hasProvinces && (
        <ProvinceMap
          countryCode={code.toUpperCase()}
          provinces={country.provinces}
          visitedCodes={visitedProvinceCodes}
          onToggle={toggleProvince}
          disabled={!isVisited}
        />
      )}

      {/* Province list for Tier 1 & 2 */}
      {hasProvinces && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Provinces / Regions ({country.provinces.length})
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {visitedProvinceCodes.size} of {country.provinces.length} visited
            {totalProvincePoints > 0 && (
              <> &middot; {Math.round(visitedProvincePoints * 10) / 10} / {Math.round(totalProvincePoints * 10) / 10} explorer pts</>
            )}
          </p>

          <div className="space-y-2 mb-8">
            {country.provinces.map((province) => {
              const isChecked = visitedProvinceCodes.has(province.code);
              return (
                <label
                  key={province.code}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  } ${!isVisited ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isVisited || toggling === province.code}
                    onChange={() => toggleProvince(province.code)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm ${isChecked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {province.name}
                      {province.disputed && <span className="ml-1 text-xs text-amber-600">(disputed)</span>}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span className="hidden sm:inline">{Number(province.population).toLocaleString()} pop</span>
                      <span className="font-medium text-indigo-600">{province.maxPoints} pts</span>
                      {toggling === province.code && <span className="text-indigo-600">saving...</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}

      {/* City list — shown for Tier 1 (bonus) and Tier 3 (exploration) */}
      {showCities && country.cities.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Cities ({country.cities.length})
            {tier === 1 && <span className="text-sm font-normal text-gray-500 ml-2">bonus points</span>}
          </h2>
          {tier === 3 && (
            <p className="text-sm text-gray-500 mb-4">
              Top cities determine your exploration score for this country.
            </p>
          )}

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
        </>
      )}

      {/* Tier 2 has no cities section */}
      {tier === 2 && !hasProvinces && country.cities.length > 0 && (
        <p className="text-sm text-gray-500 mt-4">
          City visits for Tier 2 countries don't contribute to exploration score.
        </p>
      )}
    </div>
  );
}
