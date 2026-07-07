import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
import BackLink from '../components/BackLink';
import ListControls from '../components/ListControls';

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Tab navigation (issue #53) — the page used to stack six features into one
  // very long scroll. Provinces/experiences/cities each get a tab; the score
  // breakdown and time log stay on Overview. ?tab= makes tabs deep-linkable.
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

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
        <p className="text-ink-soft text-sm">Loading country details...</p>
      </div>
    );
  }

  if (!country) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <BackLink />
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
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

  // Year for the "VISITED" stamp — earliest dated visit (visits are sorted
  // newest-first with undated last, so the last dated entry is the first trip).
  const datedVisits = visits.filter((v) => v.visited_at);
  const stampDate = datedVisits.length > 0 ? new Date(datedVisits[datedVisits.length - 1].visited_at) : null;
  const stampYear = stampDate && !Number.isNaN(stampDate.getTime()) ? stampDate.getUTCFullYear() : null;

  // Tabs (issue #53, Charlie's call on PR #55): only sections this country
  // actually has become tabs, each labelled with its visited count.
  const tabs = [{ key: 'overview', label: 'Overview' }];
  if (hasProvinces) {
    tabs.push({
      key: 'provinces',
      label: `${isTier0 ? 'States' : 'Provinces'} (${visitedProvinceCodes.size}/${country.provinces.length})`,
    });
  }
  if (isTier0 && country.experiences && country.experiences.length > 0) {
    tabs.push({ key: 'experiences', label: `Experiences (${visitedExperienceIds.size}/${country.experiences.length})` });
  }
  if (showCities && country.cities.length > 0) {
    tabs.push({ key: 'cities', label: `Cities (${visitedCityIds.size}/${country.cities.length})` });
  }
  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = tabs.some((t) => t.key === requestedTab) ? requestedTab : 'overview';
  // Preserve location.state across tab switches — setSearchParams drops it by
  // default, which would break the context-aware BackLink.
  const selectTab = (key) =>
    setSearchParams(key === 'overview' ? {} : { tab: key }, { replace: true, state: location.state });

  const provinceQuery = provinceSearch.trim().toLowerCase();
  const filteredProvinces = !hasProvinces
    ? []
    : provinceQuery
      ? country.provinces.filter(
          (p) => p.name.toLowerCase().includes(provinceQuery) || (p.subregion || '').toLowerCase().includes(provinceQuery),
        )
      : country.provinces;
  const cityQuery = citySearch.trim().toLowerCase();
  const filteredCities = cityQuery
    ? country.cities.filter((c) => c.name.toLowerCase().includes(cityQuery))
    : country.cities;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BackLink />

      <div
        className="plate rounded-lg p-6 mb-6"
        style={isTier0 ? { borderColor: 'rgba(201, 162, 39, 0.5)' } : undefined}
      >
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <span className="text-3xl leading-none" aria-hidden="true">{flagEmoji(country.code)}</span>
          <h1 className="font-display font-black text-3xl text-ink">{country.name}</h1>
          <span
            className={`smallcaps px-2.5 py-0.5 rounded-full border ${
              isTier0 ? 'bg-gold/15 text-ink border-gold/40' : 'bg-paper text-ink-soft border-hairline'
            }`}
          >
            {tierLabel}
          </span>
          {isVisited && (
            <span className="stamp text-compass ml-auto">
              VISITED{stampYear ? ` · ${stampYear}` : ''}
            </span>
          )}
          {isTier0 && isVisited && (
            <div className="relative">
              <button
                type="button"
                onClick={openBattlePicker}
                className="smallcaps bg-ink text-paper rounded-md px-3 py-2.5 hover:bg-ink/85 flex items-center gap-1"
              >
                ⚔ Battle
              </button>
              {showBattlePicker && (
                <div className="absolute right-0 top-full mt-2 z-10 w-64 bg-panel border border-hairline rounded-lg shadow-lg p-2">
                  <p className="text-xs text-ink-soft px-2 py-1">
                    Only travellers who've also visited {country.name}
                  </p>
                  {battleOpponents === null && (
                    <p className="text-xs text-ink-soft/70 px-2 py-2">Loading…</p>
                  )}
                  {battleOpponents !== null && battleOpponents.length === 0 && (
                    <p className="text-xs text-ink-soft/70 px-2 py-2">No one else has visited {country.name} yet.</p>
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
                            className="w-full text-left text-sm text-ink px-2 py-2.5 rounded-md hover:bg-parchment/60"
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
                    className="text-xs text-ink-soft/70 hover:text-ink px-2 py-2"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="smallcaps text-ink-soft mb-4">{country.region} &middot; {country.code}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-0 md:divide-x md:divide-hairline md:border-y md:border-hairline">
          <div className="border border-hairline rounded-md md:border-0 md:rounded-none px-4 py-3">
            <p className="smallcaps text-ink-soft">Base Points</p>
            <p className="font-display font-black text-2xl sm:text-3xl tabular-nums text-ink">{country.baseline_points}</p>
          </div>
          <div className="border border-hairline rounded-md md:border-0 md:rounded-none px-4 py-3">
            <p className="smallcaps text-ink-soft">Explorer Bonus</p>
            <p className="font-display font-black text-2xl sm:text-3xl tabular-nums text-ink">
              <span className="font-sans font-medium text-xs text-ink-soft">up to </span>
              {country.explorer_ceiling}
            </p>
          </div>
          <div className="border border-hairline rounded-md md:border-0 md:rounded-none px-4 py-3">
            <p className="smallcaps text-ink-soft">Max Total</p>
            <p className="font-display font-black text-2xl sm:text-3xl tabular-nums text-ink">{Math.round((country.baseline_points + country.explorer_ceiling) * 10) / 10}</p>
          </div>
        </div>

        {isVisited && (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-parchment rounded-full h-1.5 max-w-xs" role="progressbar" aria-valuenow={Math.round(explored * 10) / 10} aria-valuemin={0} aria-valuemax={100} aria-label="Country exploration">
                <div
                  className="bg-atlas h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(explored, 100)}%` }}
                />
              </div>
              <span className="text-sm text-ink tabular-nums">
                {Math.round(explored * 10) / 10}% explored
              </span>
            </div>
          </div>
        )}

        {isTier0 && isVisited && scoreDetail?.subregionBreakdown && (
          <div className="mt-4 pt-4 border-t border-hairline">
            <p className="smallcaps text-ink-soft mb-2">Sub-region bonuses</p>
            <div className="flex flex-wrap gap-2">
              {scoreDetail.subregionBreakdown.map((sr) => (
                <span
                  key={sr.name}
                  className={`text-xs px-2 py-1 rounded-full border ${
                    sr.earned ? 'bg-gold/15 text-ink border-gold/40' : 'bg-paper text-ink-soft border-hairline'
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

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">{error}</div>
      )}

      {!isVisited && (
        <div className="bg-gold/10 border border-gold/40 text-ink px-4 py-3 rounded-md mb-6 text-sm">
          Add this country to your visited list first to log visits.
        </div>
      )}

      {/* Section tabs — hidden when Overview is the only section */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1 bg-panel border border-hairline rounded-md p-1 mb-6" role="tablist" aria-label="Country sections">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => selectTab(key)}
              className={`px-3 sm:px-4 py-2.5 rounded-md smallcaps transition-colors ${
                activeTab === key ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'overview' && (
        <>
      <ScoreBreakdown
        country={country}
        visitedProvinceCodes={visitedProvinceCodes}
        visitedCityIds={visitedCityIds}
        scoreDetail={scoreDetail}
      />

      {/* Time spent here — feeds the Territory "Time" battle (issue #29). */}
      {isVisited && (
        <div className="bg-panel border border-hairline rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display font-bold text-lg text-ink">Time spent here</h2>
            <span className="text-sm font-semibold text-ink tabular-nums">
              {totalDays} {totalDays === 1 ? 'day' : 'days'} total
            </span>
          </div>
          <p className="text-sm text-ink-soft mb-4">
            Log how long you've stayed — add a date if you remember it, or just the days.
            This powers your Territory battles and never changes your Travel Points.
          </p>

          {visits.length > 0 && (
            <ul className="space-y-2 mb-4">
              {visits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between px-4 py-2.5 rounded-md border border-hairline bg-paper"
                >
                  <span className="text-sm text-ink">
                    <span className="font-medium">{v.days} {Number(v.days) === 1 ? 'day' : 'days'}</span>
                    <span className="text-ink-soft/70 mx-2">·</span>
                    <span className={v.visited_at ? 'text-ink-soft' : 'text-ink-soft/70 italic'}>
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
              <label htmlFor="visit-days" className="block smallcaps text-ink-soft mb-1">Days</label>
              <input
                id="visit-days"
                type="number"
                min="1"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                placeholder="e.g. 7"
                className="w-24 px-3 py-2.5 border border-hairline bg-panel rounded-md text-sm text-ink focus:border-compass focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="visit-date" className="block smallcaps text-ink-soft mb-1">
                Date <span className="text-ink-soft/70 normal-case">(optional)</span>
              </label>
              <input
                id="visit-date"
                type="date"
                value={dateInput}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDateInput(e.target.value)}
                className="px-3 py-2.5 border border-hairline bg-panel rounded-md text-sm text-ink focus:border-compass focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingVisit}
              className="px-4 py-2.5 bg-compass text-paper rounded-md text-sm font-medium hover:bg-compass-deep disabled:opacity-50"
            >
              {savingVisit ? 'Adding…' : 'Add time'}
            </button>
          </form>

          {visitError && (
            <p role="alert" className="mt-3 text-sm text-red-600">{visitError}</p>
          )}
        </div>
      )}
        </>
      )}

      {/* Province map — Tier 0 provinces carry real percentExplored for the hover tooltip */}
      {activeTab === 'provinces' && hasProvinces && (
        <>
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

          <h2 className="font-display font-bold text-lg text-ink mb-1">
            {isTier0 ? 'States / Provinces' : 'Provinces / Regions'} ({country.provinces.length})
          </h2>
          <p className="text-sm text-ink-soft mb-4">
            {visitedProvinceCodes.size} of {country.provinces.length} visited
            {totalProvincePoints > 0 && (
              <> &middot; {Math.round(visitedProvincePoints * 10) / 10} / {Math.round(totalProvincePoints * 10) / 10} explorer pts</>
            )}
          </p>

          {country.provinces.length > 8 && (
            <ListControls
              search={provinceSearch}
              onSearch={setProvinceSearch}
              placeholder={`Search ${isTier0 ? 'states' : 'provinces'} by name…`}
            />
          )}

          <div className="space-y-2 mb-8">
            {filteredProvinces.length === 0 && (
              <p className="text-center text-ink-soft py-8">No {isTier0 ? 'states' : 'provinces'} match your search.</p>
            )}
            {filteredProvinces.map((province) => {
              const isChecked = visitedProvinceCodes.has(province.code);
              const tier0 = tier0BreakdownByCode?.[province.code];
              const displayMaxPoints = tier0 ? tier0.maxPoints : province.maxPoints;
              const isExpanded = expandedProvinceCode === province.code;
              return (
                <div
                  key={province.code}
                  className={`rounded-lg border transition-colors ${
                    isChecked ? 'bg-atlas/10 border-atlas/40' : 'bg-panel border-hairline hover:border-ink-soft/40'
                  }`}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 ${!isVisited ? 'opacity-50' : ''}`}>
                    <label className={`flex items-center gap-3 flex-1 ${!isVisited ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isVisited || toggling === province.code}
                        onChange={() => toggleProvince(province.code)}
                        className="h-4 w-4 rounded border-hairline accent-atlas"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className={`text-sm text-ink ${isChecked ? 'font-medium' : ''}`}>
                          {province.name}
                          {!!province.disputed && (
                            <span className="ml-1.5 align-middle smallcaps text-[9px] px-1.5 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-ink">
                              disputed
                            </span>
                          )}
                          {!!province.subregion && (
                            <span className="ml-2 text-xs text-ink-soft/70">{province.subregion}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-ink-soft flex-shrink-0">
                          <span className="hidden sm:inline">{Number(province.population).toLocaleString()} pop</span>
                          {tier0 && (
                            <span className="text-ink-soft/70">{Math.round(tier0.percentExplored * 1000) / 10}% explored</span>
                          )}
                          <span className="font-medium text-ink tabular-nums">{displayMaxPoints} pts</span>
                          {toggling === province.code && <span className="text-ink-soft">saving...</span>}
                        </div>
                      </div>
                    </label>
                    {isTier0 && isChecked && (
                      <button
                        type="button"
                        onClick={() => toggleProvinceTimePanel(province.code)}
                        className="smallcaps text-ink-soft hover:text-compass flex-shrink-0 py-2"
                      >
                        {isExpanded ? 'Hide time' : '⏱ Log time'}
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-hairline">
                      <p className="text-xs text-ink-soft mb-2">
                        {provinceTotalDays} {provinceTotalDays === 1 ? 'day' : 'days'} total in {province.name}
                      </p>
                      {provinceVisits.length > 0 && (
                        <ul className="space-y-1.5 mb-2">
                          {provinceVisits.map((v) => (
                            <li key={v.id} className="flex items-center justify-between text-xs text-ink px-3 py-1.5 rounded-md border border-hairline bg-paper">
                              <span>
                                <span className="font-medium">{v.days} {Number(v.days) === 1 ? 'day' : 'days'}</span>
                                <span className="text-ink-soft/70 mx-1.5">·</span>
                                <span className={v.visited_at ? 'text-ink-soft' : 'text-ink-soft/70 italic'}>
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
                          className="w-20 px-2 py-2.5 border border-hairline bg-panel rounded-md text-xs text-ink focus:border-compass focus:outline-none"
                        />
                        <input
                          type="date"
                          value={provinceDateInput}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setProvinceDateInput(e.target.value)}
                          className="px-2 py-2.5 border border-hairline bg-panel rounded-md text-xs text-ink focus:border-compass focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={savingProvinceVisit}
                          className="px-3 py-2.5 bg-compass text-paper rounded-md text-xs font-medium hover:bg-compass-deep disabled:opacity-50"
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
      {activeTab === 'experiences' && isTier0 && country.experiences && country.experiences.length > 0 && (
        <>
          <h2 className="font-display font-bold text-lg text-ink mb-1">
            Experiences ({country.experiences.length})
          </h2>
          <p className="text-sm text-ink-soft mb-4">
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
                    <p className="text-sm font-medium text-ink mb-2">
                      {province.name}
                      {tier0 && (
                        <span className="text-xs font-normal text-ink-soft/70 ml-2">
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
                                ? 'bg-gold/10 border-gold/40'
                                : 'bg-panel border-hairline hover:border-ink-soft/40'
                            } ${!isVisited ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={!isVisited || toggling === exp.id}
                              onChange={() => toggleExperience(exp.id, province.code)}
                              className="h-4 w-4 rounded border-hairline accent-gold"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-sm text-ink ${isChecked ? 'font-medium' : ''}`}>
                                {exp.name}
                              </span>
                              {toggling === exp.id && <span className="text-xs text-ink-soft">saving...</span>}
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
      {activeTab === 'cities' && showCities && country.cities.length > 0 && (
        <>
          <h2 className="font-display font-bold text-lg text-ink mb-1">
            Cities ({country.cities.length})
            {!isTier0 && <span className="text-sm font-sans font-normal text-ink-soft ml-2">0.5 pts each</span>}
          </h2>

          {country.cities.length > 8 && (
            <div className="mt-3">
              <ListControls search={citySearch} onSearch={setCitySearch} placeholder="Search cities by name…" />
            </div>
          )}

          <div className="space-y-2">
            {filteredCities.length === 0 && (
              <p className="text-center text-ink-soft py-8">No cities match your search.</p>
            )}
            {filteredCities.map((city) => {
              const isChecked = visitedCityIds.has(city.id);
              const cityPoints = city.city_type === 'additional' ? 0.25 : 0.5;
              return (
                <label
                  key={city.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                    isChecked
                      ? 'bg-atlas/10 border-atlas/40'
                      : 'bg-panel border-hairline hover:border-ink-soft/40'
                  } ${!isVisited ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isVisited || toggling === city.id}
                    onChange={() => toggleCity(city.id)}
                    className="h-4 w-4 rounded border-hairline accent-atlas"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className={`text-sm text-ink ${isChecked ? 'font-medium' : ''}`}>
                      {city.name}
                      {isTier0 && city.city_type === 'additional' && (
                        <span className="ml-1 text-xs text-ink-soft/70">(additional)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-ink-soft flex-shrink-0">
                      <span className="hidden sm:inline">{Number(city.population).toLocaleString()} pop</span>
                      <span className={`tabular-nums ${isChecked ? 'text-ink font-medium' : ''}`}>+{cityPoints} pts</span>
                      {toggling === city.id && <span className="text-ink-soft">saving...</span>}
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
