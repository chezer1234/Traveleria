import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  addCityOptimistic,
  removeCityOptimistic,
  addProvinceOptimistic,
  removeProvinceOptimistic,
  addProvinceExperienceOptimistic,
  removeProvinceExperienceOptimistic,
  addCountryVisitOptimistic,
  removeCountryVisitOptimistic,
  addProvinceVisitOptimistic,
  removeProvinceVisitOptimistic,
} from '../lib/mutations';
import {
  getCountryLocal,
  getUserStatusForCountry,
  getCountryVisitsLocal,
  getUserCountryScoreLocal,
  getProvinceVisitsLocal,
  getUsersWhoVisitedCountryLocal,
} from '../lib/queries';
import ProvinceMap from '../components/ProvinceMap';
import ScoreBreakdown from '../components/ScoreBreakdown';

// Tier 0 (issue #46): flag banner at the top of the country page. Same emoji
// derivation used on Leaderboard/Territory/Groups — no image assets exist yet.
const flagEmoji = (code) =>
  code ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

// Dated visits first (newest first), undated ("no date") last. Mirrors the SQL
// ordering in getCountryVisitsLocal so optimistic inserts land in the right spot.
function sortVisits(list) {
  return [...list].sort((a, b) => {
    if (!a.visited_at && !b.visited_at) return 0;
    if (!a.visited_at) return 1;
    if (!b.visited_at) return -1;
    return b.visited_at.localeCompare(a.visited_at);
  });
}

function formatVisitDate(iso) {
  if (!iso) return 'No date';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'No date'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CountryDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, db, dbStatus } = useAuth();
  const homeCountry = user.home_country;
  const [country, setCountry] = useState(null);
  const [visitedCityIds, setVisitedCityIds] = useState(new Set());
  const [visitedProvinceCodes, setVisitedProvinceCodes] = useState(new Set());
  const [visitedExperienceIds, setVisitedExperienceIds] = useState(new Set());
  const [scoreDetail, setScoreDetail] = useState(null); // Tier 0: real per-province earned/percentExplored
  const [isVisited, setIsVisited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(null);

  // Time-log ("Time spent here") state — territory score, issue #29.
  const [visits, setVisits] = useState([]);
  const [totalDays, setTotalDays] = useState(0);
  const [daysInput, setDaysInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [savingVisit, setSavingVisit] = useState(false);
  const [visitError, setVisitError] = useState('');

  // Per-province time log — Tier 0 (issue #46 Phase 2). Only one state's panel
  // is expanded at a time, so one set of form/list state is enough.
  const [expandedProvinceCode, setExpandedProvinceCode] = useState(null);
  const [provinceVisits, setProvinceVisits] = useState([]);
  const [provinceTotalDays, setProvinceTotalDays] = useState(0);
  const [provinceDaysInput, setProvinceDaysInput] = useState('');
  const [provinceDateInput, setProvinceDateInput] = useState('');
  const [savingProvinceVisit, setSavingProvinceVisit] = useState(false);
  const [provinceVisitError, setProvinceVisitError] = useState('');

  // State battle opponent picker — Tier 0 (issue #46 Phase 2). Only offered
  // between two users who've both visited this country.
  const [showBattlePicker, setShowBattlePicker] = useState(false);
  const [battleOpponents, setBattleOpponents] = useState(null); // null = not loaded yet

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [countryData, status, timeLog] = await Promise.all([
        getCountryLocal(db, code, homeCountry),
        getUserStatusForCountry(db, user.id, code),
        getCountryVisitsLocal(db, user.id, code),
      ]);
      setCountry(countryData);
      setIsVisited(status.isVisited);
      setVisitedCityIds(status.visitedCityIds);
      setVisitedProvinceCodes(status.visitedProvinceCodes);
      setVisitedExperienceIds(status.visitedExperienceIds);
      setVisits(timeLog.visits);
      setTotalDays(timeLog.totalDays);
      if (countryData.tier === 0) {
        setScoreDetail(await getUserCountryScoreLocal(db, user.id, code, homeCountry));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, code, user.id, homeCountry]);

  // Tier 0: re-fetch the real per-province breakdown after a mutation so
  // earned/percentExplored stay accurate (the simple client-side approximation
  // used for Tier 1/2 doesn't hold once a province can be 90%-140%+ earned).
  const refreshScoreDetail = useCallback(async () => {
    if (!country || country.tier !== 0) return;
    setScoreDetail(await getUserCountryScoreLocal(db, user.id, code, homeCountry));
  }, [db, code, user.id, homeCountry, country]);

  async function addVisit(e) {
    e.preventDefault();
    setVisitError('');
    const days = parseInt(daysInput, 10);
    if (!Number.isInteger(days) || days < 1) {
      setVisitError('Enter a whole number of days (1 or more).');
      return;
    }
    // <input type="date"> gives YYYY-MM-DD; the API wants a full ISO datetime.
    const visitedAt = dateInput ? new Date(`${dateInput}T00:00:00Z`).toISOString() : null;
    setSavingVisit(true);
    try {
      const id = await addCountryVisitOptimistic(db, user.id, code, days, visitedAt);
      setVisits((prev) => sortVisits([...prev, { id, days, visited_at: visitedAt }]));
      setTotalDays((d) => d + days);
      setDaysInput('');
      setDateInput('');
    } catch (err) {
      setVisitError(err.message);
    } finally {
      setSavingVisit(false);
    }
  }

  async function deleteVisit(visit) {
    setVisitError('');
    setVisits((prev) => prev.filter((v) => v.id !== visit.id));
    setTotalDays((d) => d - (Number(visit.days) || 0));
    try {
      await removeCountryVisitOptimistic(db, user.id, visit.id);
    } catch (err) {
      setVisitError(err.message);
      setVisits((prev) => sortVisits([...prev, visit]));
      setTotalDays((d) => d + (Number(visit.days) || 0));
    }
  }

  // Per-province time log — Tier 0 (issue #46 Phase 2). Toggling a state's
  // panel loads its visits on the way open; only one panel is open at a time.
  async function toggleProvinceTimePanel(provinceCode) {
    if (expandedProvinceCode === provinceCode) {
      setExpandedProvinceCode(null);
      return;
    }
    setProvinceVisitError('');
    setProvinceDaysInput('');
    setProvinceDateInput('');
    const timeLog = await getProvinceVisitsLocal(db, user.id, provinceCode);
    setProvinceVisits(timeLog.visits);
    setProvinceTotalDays(timeLog.totalDays);
    setExpandedProvinceCode(provinceCode);
  }

  async function addProvinceVisit(e, provinceCode) {
    e.preventDefault();
    setProvinceVisitError('');
    const days = parseInt(provinceDaysInput, 10);
    if (!Number.isInteger(days) || days < 1) {
      setProvinceVisitError('Enter a whole number of days (1 or more).');
      return;
    }
    const visitedAt = provinceDateInput ? new Date(`${provinceDateInput}T00:00:00Z`).toISOString() : null;
    setSavingProvinceVisit(true);
    try {
      const id = await addProvinceVisitOptimistic(db, user.id, provinceCode, days, visitedAt);
      setProvinceVisits((prev) => sortVisits([...prev, { id, days, visited_at: visitedAt }]));
      setProvinceTotalDays((d) => d + days);
      setProvinceDaysInput('');
      setProvinceDateInput('');
    } catch (err) {
      setProvinceVisitError(err.message);
    } finally {
      setSavingProvinceVisit(false);
    }
  }

  async function deleteProvinceVisit(visit) {
    setProvinceVisitError('');
    setProvinceVisits((prev) => prev.filter((v) => v.id !== visit.id));
    setProvinceTotalDays((d) => d - (Number(visit.days) || 0));
    try {
      await removeProvinceVisitOptimistic(db, user.id, visit.id);
    } catch (err) {
      setProvinceVisitError(err.message);
      setProvinceVisits((prev) => sortVisits([...prev, visit]));
      setProvinceTotalDays((d) => d + (Number(visit.days) || 0));
    }
  }

  async function openBattlePicker() {
    setShowBattlePicker(true);
    if (battleOpponents === null) {
      const opponents = await getUsersWhoVisitedCountryLocal(db, code.toUpperCase(), user.id);
      setBattleOpponents(opponents);
    }
  }

  useEffect(() => {
    if (dbStatus === 'ready') loadData();
  }, [dbStatus, loadData]);

  async function toggleCity(cityId) {
    if (!isVisited) return;
    setToggling(cityId);
    setError('');
    const wasVisited = visitedCityIds.has(cityId);
    // Flip React state ahead of the await so the checkbox snaps immediately.
    // If the worker throws, we undo below.
    setVisitedCityIds((prev) => {
      const next = new Set(prev);
      wasVisited ? next.delete(cityId) : next.add(cityId);
      return next;
    });
    try {
      if (wasVisited) {
        await removeCityOptimistic(db, user.id, cityId);
      } else {
        await addCityOptimistic(db, user.id, cityId);
      }
      await refreshScoreDetail();
    } catch (err) {
      setError(err.message);
      // Roll the UI state back — the savepoint already rolled the DB back.
      setVisitedCityIds((prev) => {
        const next = new Set(prev);
        wasVisited ? next.add(cityId) : next.delete(cityId);
        return next;
      });
    } finally {
      setToggling(null);
    }
  }

  async function toggleProvince(provinceCode) {
    if (!isVisited) return;
    setToggling(provinceCode);
    setError('');
    const wasVisited = visitedProvinceCodes.has(provinceCode);
    setVisitedProvinceCodes((prev) => {
      const next = new Set(prev);
      wasVisited ? next.delete(provinceCode) : next.add(provinceCode);
      return next;
    });
    try {
      if (wasVisited) {
        await removeProvinceOptimistic(db, user.id, provinceCode);
      } else {
        await addProvinceOptimistic(db, user.id, provinceCode);
      }
      await refreshScoreDetail();
    } catch (err) {
      setError(err.message);
      setVisitedProvinceCodes((prev) => {
        const next = new Set(prev);
        wasVisited ? next.add(provinceCode) : next.delete(provinceCode);
        return next;
      });
    } finally {
      setToggling(null);
    }
  }

  // Tier 0 (issue #46): log/unlog one experience within a state/province.
  // Logging the first experience in a not-yet-visited province auto-marks it
  // visited too (mirrors the server route) so the 90% baseline is never missed.
  async function toggleExperience(experienceId, provinceCode) {
    if (!isVisited) return;
    setToggling(experienceId);
    setError('');
    const wasVisited = visitedExperienceIds.has(experienceId);
    const alreadyVisitedProvince = visitedProvinceCodes.has(provinceCode);
    setVisitedExperienceIds((prev) => {
      const next = new Set(prev);
      wasVisited ? next.delete(experienceId) : next.add(experienceId);
      return next;
    });
    if (!wasVisited && !alreadyVisitedProvince) {
      setVisitedProvinceCodes((prev) => new Set(prev).add(provinceCode));
    }
    try {
      if (wasVisited) {
        await removeProvinceExperienceOptimistic(db, user.id, experienceId);
      } else {
        await addProvinceExperienceOptimistic(db, user.id, experienceId, provinceCode, alreadyVisitedProvince);
      }
      await refreshScoreDetail();
    } catch (err) {
      setError(err.message);
      setVisitedExperienceIds((prev) => {
        const next = new Set(prev);
        wasVisited ? next.add(experienceId) : next.delete(experienceId);
        return next;
      });
      if (!wasVisited && !alreadyVisitedProvince) {
        setVisitedProvinceCodes((prev) => {
          const next = new Set(prev);
          next.delete(provinceCode);
          return next;
        });
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading || dbStatus !== 'ready') {
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
  const isTier0 = tier === 0;
  const hasProvinces = (tier === 0 || tier === 1 || tier === 2) && country.provinces && country.provinces.length > 0;
  const showCities = tier === 0 || tier === 1 || tier === 2 || tier === 3;

  // Tier 0 provinces are keyed by real earned/percentExplored from
  // scoreDetail.provinceBreakdown (90%-140%+ scale) — Tier 1/2 use the
  // simpler "visited = full maxPoints" approximation, which still holds there.
  const tier0BreakdownByCode = isTier0 && scoreDetail?.provinceBreakdown
    ? Object.fromEntries(scoreDetail.provinceBreakdown.map((p) => [p.code, p]))
    : null;

  const visitedProvincePoints = !hasProvinces
    ? 0
    : tier0BreakdownByCode
      ? Object.values(tier0BreakdownByCode).reduce((sum, p) => sum + p.earnedPoints, 0)
      : country.provinces.filter((p) => visitedProvinceCodes.has(p.code)).reduce((sum, p) => sum + p.maxPoints, 0);
  const totalProvincePoints = !hasProvinces
    ? 0
    : tier0BreakdownByCode
      ? Object.values(tier0BreakdownByCode).reduce((sum, p) => sum + p.maxPoints, 0)
      : country.provinces.reduce((sum, p) => sum + p.maxPoints, 0);
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

      <div className={`bg-white rounded-xl shadow-sm border p-6 mb-6 ${isTier0 ? 'border-amber-300' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-1">
          {isTier0 && <span className="text-2xl leading-none" aria-hidden="true">{flagEmoji(country.code)}</span>}
          <h1 className="text-2xl font-bold text-gray-900">{country.name}</h1>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isTier0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tierLabel}
          </span>
          {isTier0 && isVisited && (
            <div className="relative ml-auto">
              <button
                type="button"
                onClick={openBattlePicker}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                ⚔ Battle
              </button>
              {showBattlePicker && (
                <div className="absolute right-0 top-7 z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                  <p className="text-xs text-gray-500 px-2 py-1">
                    Only travellers who've also visited {country.name}
                  </p>
                  {battleOpponents === null && (
                    <p className="text-xs text-gray-400 px-2 py-2">Loading…</p>
                  )}
                  {battleOpponents !== null && battleOpponents.length === 0 && (
                    <p className="text-xs text-gray-400 px-2 py-2">No one else has visited {country.name} yet.</p>
                  )}
                  {battleOpponents !== null && battleOpponents.length > 0 && (
                    <ul className="max-h-56 overflow-y-auto">
                      {battleOpponents.map((opp) => (
                        <li key={opp.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowBattlePicker(false);
                              navigate(`/state-battle/${opp.id}/${country.code}`);
                            }}
                            className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-100"
                          >
                            {opp.identifier}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBattlePicker(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 pt-1"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
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

        {isTier0 && isVisited && scoreDetail?.subregionBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Sub-region bonuses</p>
            <div className="flex flex-wrap gap-2">
              {scoreDetail.subregionBreakdown.map((sr) => (
                <span
                  key={sr.name}
                  className={`text-xs px-2 py-1 rounded-full ${
                    sr.earned ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'
                  }`}
                  title={`${sr.visited} of ${sr.total} states visited`}
                >
                  {sr.name}: {sr.visited}/{sr.total} {sr.earned ? `· +${sr.bonus} pts earned` : `(+${sr.bonus} pts if completed)`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <ScoreBreakdown
        country={country}
        visitedProvinceCodes={visitedProvinceCodes}
        visitedCityIds={visitedCityIds}
        scoreDetail={scoreDetail}
      />

      {/* Time spent here — feeds the Territory "Time" battle (issue #29). */}
      {isVisited && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-gray-900">Time spent here</h2>
            <span className="text-sm font-medium text-indigo-600">
              {totalDays} {totalDays === 1 ? 'day' : 'days'} total
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Log how long you've stayed — add a date if you remember it, or just the days.
            This powers your Territory battles and never changes your Travel Points.
          </p>

          {visits.length > 0 && (
            <ul className="space-y-2 mb-4">
              {visits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50"
                >
                  <span className="text-sm text-gray-800">
                    <span className="font-medium">{v.days} {Number(v.days) === 1 ? 'day' : 'days'}</span>
                    <span className="text-gray-400 mx-2">·</span>
                    <span className={v.visited_at ? 'text-gray-600' : 'text-gray-400 italic'}>
                      {formatVisitDate(v.visited_at)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteVisit(v)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                    aria-label={`Remove ${v.days} day visit`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addVisit} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="visit-days" className="block text-xs text-gray-500 mb-1">Days</label>
              <input
                id="visit-days"
                type="number"
                min="1"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                placeholder="e.g. 7"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="visit-date" className="block text-xs text-gray-500 mb-1">
                Date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="visit-date"
                type="date"
                value={dateInput}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateInput(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={savingVisit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingVisit ? 'Adding…' : 'Add time'}
            </button>
          </form>

          {visitError && (
            <p role="alert" className="mt-3 text-sm text-red-600">{visitError}</p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {!isVisited && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 text-sm">
          Add this country to your visited list first to log visits.
        </div>
      )}

      {/* Province map — Tier 0 provinces carry real percentExplored for the hover tooltip */}
      {hasProvinces && (
        <ProvinceMap
          countryCode={code.toUpperCase()}
          provinces={country.provinces.map((p) => {
            const tier0 = tier0BreakdownByCode?.[p.code];
            return tier0 ? { ...p, maxPoints: tier0.maxPoints, percentExplored: tier0.percentExplored } : p;
          })}
          visitedCodes={visitedProvinceCodes}
          onToggle={toggleProvince}
          disabled={!isVisited}
        />
      )}

      {/* Province list */}
      {hasProvinces && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {isTier0 ? 'States / Provinces' : 'Provinces / Regions'} ({country.provinces.length})
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
              const tier0 = tier0BreakdownByCode?.[province.code];
              const displayMaxPoints = tier0 ? tier0.maxPoints : province.maxPoints;
              const isExpanded = expandedProvinceCode === province.code;
              return (
                <div
                  key={province.code}
                  className={`rounded-lg border transition-colors ${
                    isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 ${!isVisited ? 'opacity-50' : ''}`}>
                    <label className={`flex items-center gap-3 flex-1 ${!isVisited ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
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
                          {!!province.disputed && <span className="ml-1 text-xs text-amber-600">(disputed)</span>}
                          {!!province.subregion && (
                            <span className="ml-2 text-xs text-gray-400">{province.subregion}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-shrink-0">
                          <span className="hidden sm:inline">{Number(province.population).toLocaleString()} pop</span>
                          {tier0 && (
                            <span className="text-gray-400">{Math.round(tier0.percentExplored * 1000) / 10}% explored</span>
                          )}
                          <span className="font-medium text-indigo-600">{displayMaxPoints} pts</span>
                          {toggling === province.code && <span className="text-indigo-600">saving...</span>}
                        </div>
                      </div>
                    </label>
                    {isTier0 && isChecked && (
                      <button
                        type="button"
                        onClick={() => toggleProvinceTimePanel(province.code)}
                        className="text-xs text-gray-500 hover:text-indigo-600 flex-shrink-0"
                      >
                        {isExpanded ? 'Hide time' : '⏱ Log time'}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-indigo-100">
                      <p className="text-xs text-gray-500 mb-2">
                        {provinceTotalDays} {provinceTotalDays === 1 ? 'day' : 'days'} total in {province.name}
                      </p>
                      {provinceVisits.length > 0 && (
                        <ul className="space-y-1.5 mb-2">
                          {provinceVisits.map((v) => (
                            <li key={v.id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded border border-gray-200 bg-gray-50">
                              <span>
                                <span className="font-medium">{v.days} {Number(v.days) === 1 ? 'day' : 'days'}</span>
                                <span className="text-gray-400 mx-1.5">·</span>
                                <span className={v.visited_at ? 'text-gray-600' : 'text-gray-400 italic'}>
                                  {formatVisitDate(v.visited_at)}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => deleteProvinceVisit(v)}
                                className="text-red-500 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form onSubmit={(e) => addProvinceVisit(e, province.code)} className="flex flex-wrap items-end gap-2">
                        <input
                          type="number"
                          min="1"
                          value={provinceDaysInput}
                          onChange={(e) => setProvinceDaysInput(e.target.value)}
                          placeholder="Days"
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                          type="date"
                          value={provinceDateInput}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setProvinceDateInput(e.target.value)}
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={savingProvinceVisit}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingProvinceVisit ? 'Adding…' : 'Add time'}
                        </button>
                      </form>
                      {provinceVisitError && (
                        <p role="alert" className="mt-2 text-xs text-red-600">{provinceVisitError}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Experiences — Tier 0 only (issue #46) */}
      {isTier0 && country.experiences && country.experiences.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Experiences ({country.experiences.length})
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {visitedExperienceIds.size} of {country.experiences.length} logged — split a state's experience pool evenly
          </p>

          <div className="space-y-4 mb-8">
            {country.provinces
              .filter((p) => country.experiences.some((e) => e.province_code === p.code))
              .map((province) => {
                const experiences = country.experiences.filter((e) => e.province_code === province.code);
                const tier0 = tier0BreakdownByCode?.[province.code];
                return (
                  <div key={province.code}>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {province.name}
                      {tier0 && (
                        <span className="text-xs font-normal text-gray-400 ml-2">
                          {tier0.experiences.visited}/{tier0.experiences.total} logged &middot; {tier0.experiences.pointsEach} pts each
                        </span>
                      )}
                    </p>
                    <div className="space-y-2">
                      {experiences.map((exp) => {
                        const isChecked = visitedExperienceIds.has(exp.id);
                        return (
                          <label
                            key={exp.id}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            } ${!isVisited ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isVisited || toggling === exp.id}
                              onChange={() => toggleExperience(exp.id, province.code)}
                              className="h-4 w-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-sm ${isChecked ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                                {exp.name}
                              </span>
                              {toggling === exp.id && <span className="text-xs text-amber-600">saving...</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* City list — 0.5 pts (major) for all tiers; Tier 0 "additional" cities are 0.25 pts */}
      {showCities && country.cities.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Cities ({country.cities.length})
            {!isTier0 && <span className="text-sm font-normal text-gray-500 ml-2">0.5 pts each</span>}
          </h2>

          <div className="space-y-2">
            {country.cities.map((city) => {
              const isChecked = visitedCityIds.has(city.id);
              const cityPoints = city.city_type === 'additional' ? 0.25 : 0.5;
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
                      {isTier0 && city.city_type === 'additional' && (
                        <span className="ml-1 text-xs text-gray-400">(additional)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 flex-shrink-0">
                      <span className="hidden sm:inline">{Number(city.population).toLocaleString()} pop</span>
                      <span className={isChecked ? 'text-indigo-600 font-medium' : ''}>+{cityPoints} pts</span>
                      {toggling === city.id && <span className="text-indigo-600">saving...</span>}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
