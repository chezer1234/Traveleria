// One Tier 0 country's (US/China) state experiences for the global
// Experiences tab — the same grouped-by-state checkbox list as the country
// page's Experiences tab (CountryDetail.jsx), in a fixed-height scroll box.
// Uses the same queries + optimistic mutations, so ticking an experience here
// behaves identically (including auto-marking the state visited).
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCountryLocal, getUserStatusForCountry, getUserCountryScoreLocal } from '../lib/queries';
import { addProvinceExperienceOptimistic, removeProvinceExperienceOptimistic } from '../lib/mutations';
import CountryOutline from './CountryOutline';
import CountryLink from './CountryLink';

export default function Tier0ExperiencePanel({ code }) {
  const { user, db, dbStatus } = useAuth();
  const homeCountry = user.home_country;
  const [country, setCountry] = useState(null);
  const [isVisited, setIsVisited] = useState(false);
  const [visitedProvinceCodes, setVisitedProvinceCodes] = useState(new Set());
  const [visitedExperienceIds, setVisitedExperienceIds] = useState(new Set());
  const [scoreDetail, setScoreDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [countryData, status, score] = await Promise.all([
        getCountryLocal(db, code, homeCountry),
        getUserStatusForCountry(db, user.id, code),
        getUserCountryScoreLocal(db, user.id, code, homeCountry),
      ]);
      setCountry(countryData);
      setIsVisited(status.isVisited);
      setVisitedProvinceCodes(status.visitedProvinceCodes);
      setVisitedExperienceIds(status.visitedExperienceIds);
      setScoreDetail(score);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, code, user.id, homeCountry]);

  useEffect(() => {
    if (dbStatus === 'ready') loadData();
  }, [dbStatus, loadData]);

  const refreshScoreDetail = useCallback(async () => {
    setScoreDetail(await getUserCountryScoreLocal(db, user.id, code, homeCountry));
  }, [db, code, user.id, homeCountry]);

  async function toggleExperience(experienceId, provinceCode) {
    if (!isVisited) return;
    setToggling(experienceId);
    setError('');
    const wasVisited = visitedExperienceIds.has(experienceId);
    const alreadyVisitedProvince = visitedProvinceCodes.has(provinceCode);
    const flip = (set, id, add) => {
      const next = new Set(set);
      add ? next.add(id) : next.delete(id);
      return next;
    };
    setVisitedExperienceIds((prev) => flip(prev, experienceId, !wasVisited));
    if (!wasVisited && !alreadyVisitedProvince) {
      setVisitedProvinceCodes((prev) => flip(prev, provinceCode, true));
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
      setVisitedExperienceIds((prev) => flip(prev, experienceId, wasVisited));
      if (!wasVisited && !alreadyVisitedProvince) {
        setVisitedProvinceCodes((prev) => flip(prev, provinceCode, false));
      }
    } finally {
      setToggling(null);
    }
  }

  const name = country?.name || (code === 'US' ? 'United States' : 'China');
  const experiences = country?.experiences || [];
  const breakdownByCode = scoreDetail?.provinceBreakdown
    ? Object.fromEntries(scoreDetail.provinceBreakdown.map((p) => [p.code, p]))
    : null;

  const query = search.trim().toLowerCase();
  const groups = (country?.provinces || [])
    .map((province) => {
      const all = experiences.filter((e) => e.province_code === province.code);
      const provinceMatches = query && province.name.toLowerCase().includes(query);
      const shown = query && !provinceMatches ? all.filter((e) => e.name.toLowerCase().includes(query)) : all;
      return { province, all, shown };
    })
    .filter((g) => g.shown.length > 0);

  return (
    <div className="flex flex-col min-w-0">
      <h3 className="font-display font-bold text-xl text-ink text-center">{name}</h3>
      <div className="mx-auto w-full max-w-xs mb-3">
        <CountryOutline code={code} name={name} />
      </div>

      <div className="flex items-baseline justify-between mb-2 gap-2">
        <span className="text-sm text-ink-soft">
          {loading ? 'Loading…' : `${visitedExperienceIds.size} of ${experiences.length} logged`}
        </span>
        {!loading && !isVisited && (
          <span className="text-xs text-ink-soft/80 text-right">
            Log <CountryLink code={code} name={name} className="underline hover:text-compass" /> to tick these off
          </span>
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${name} experiences…`}
        aria-label={`Search ${name} experiences`}
        className="border border-hairline bg-panel rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-compass mb-2"
      />

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-xs mb-2">
          {error}
        </div>
      )}

      <div
        className="plate rounded-lg h-[28rem] overflow-y-auto overscroll-contain p-3 space-y-4"
        tabIndex={0}
        aria-label={`${name} experiences`}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="loading-spinner" aria-hidden="true"></div>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-sm text-ink-soft py-8">
            {query ? 'No experiences match your search.' : 'No experiences yet.'}
          </p>
        ) : (
          groups.map(({ province, all, shown }) => {
            const tier0 = breakdownByCode?.[province.code];
            const loggedHere = all.filter((e) => visitedExperienceIds.has(e.id)).length;
            return (
              <div key={province.code}>
                <p className="text-sm font-medium text-ink mb-2">
                  {province.name}
                  <span className="text-xs font-normal text-ink-soft/70 ml-2">
                    {loggedHere}/{all.length} logged
                    {tier0 && <> &middot; {tier0.experiences.pointsEach} pts each</>}
                  </span>
                </p>
                <div className="space-y-2">
                  {shown.map((exp) => {
                    const isChecked = visitedExperienceIds.has(exp.id);
                    const isWonder = !!exp.is_new7wonders;
                    return (
                      <label
                        key={exp.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                          isWonder
                            ? isChecked
                              ? 'bg-wonder/15 border-wonder/50'
                              : 'bg-wonder/5 border-wonder/30 hover:border-wonder/50'
                            : isChecked
                              ? 'bg-gold/10 border-gold/40'
                              : 'bg-panel border-hairline hover:border-ink-soft/40'
                        } ${!isVisited ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!isVisited || toggling === exp.id}
                          onChange={() => toggleExperience(exp.id, province.code)}
                          className={`h-4 w-4 rounded border-hairline ${isWonder ? 'accent-wonder' : 'accent-gold'}`}
                        />
                        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                          <span className={`text-sm text-ink ${isChecked ? 'font-medium' : ''}`}>
                            {exp.name}
                            {isWonder && <span className="ml-2 text-xs font-medium text-wonder">Seven Wonders</span>}
                          </span>
                          {toggling === exp.id && <span className="text-xs text-ink-soft shrink-0">saving...</span>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
