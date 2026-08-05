// The global Experiences tab (issue #74) — a dedicated home for landmarks,
// wonders, and transport across every country, plus the Seven Wonders
// showcase. Backed by getSevenWondersShowcaseLocal + getAllLandmarkExperiencesLocal
// (client/src/lib/queries.js); the same content also surfaces inside each
// country's own detail page (see CountryDetail.jsx's Experiences tab) —
// same underlying data, two views, per the issue's own request.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSevenWondersShowcaseLocal, getAllLandmarkExperiencesLocal } from '../lib/queries';
import CountryLink from '../components/CountryLink';
import ListControls from '../components/ListControls';
import { countryFlag as flag } from '../lib/flag';

const SORT_OPTIONS = [
  { key: 'country', label: 'By Country' },
  { key: 'points', label: 'Top Points' },
];

function WonderCard({ wonder }) {
  return (
    <CountryLink
      code={wonder.country_code}
      tab="experiences"
      className={`block rounded-lg border p-4 transition-colors ${
        wonder.logged ? 'bg-wonder/15 border-wonder/50' : 'bg-wonder/5 border-wonder/30 hover:border-wonder/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-wonder smallcaps">Seven Wonders</span>
        {wonder.logged && <span className="text-xs text-wonder">Logged</span>}
      </div>
      <p className="font-display font-bold text-ink leading-tight mb-1">{wonder.name}</p>
      <p className="text-sm text-ink-soft">
        {flag(wonder.country_code)} {wonder.country_name}
      </p>
      {wonder.description && <p className="text-xs text-ink-soft/80 mt-2 leading-snug">{wonder.description}</p>}
    </CountryLink>
  );
}

export default function Experiences() {
  const { user, db, dbStatus } = useAuth();
  const [wonders, setWonders] = useState([]);
  const [all, setAll] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('country');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError('');
    try {
      const [wondersData, allData] = await Promise.all([
        getSevenWondersShowcaseLocal(db, user.id),
        getAllLandmarkExperiencesLocal(db, user.id, user.home_country),
      ]);
      setWonders(wondersData);
      setAll(allData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [db, user.id, user.home_country]);

  useEffect(() => {
    if (dbStatus === 'ready') loadData();
  }, [dbStatus, loadData]);

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-ink-soft text-sm">Loading experiences...</p>
      </div>
    );
  }

  if (error) {
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

  const wondersLoggedCount = wonders.filter((w) => w.logged).length;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? all.filter((e) => e.name.toLowerCase().includes(query) || e.country_name.toLowerCase().includes(query))
    : all;
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'points') {
      return (b.points ?? -1) - (a.points ?? -1);
    }
    return a.country_name.localeCompare(b.country_name) || a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">Experiences</h1>
        <p className="smallcaps text-ink-soft mt-1">World wonders, landmarks, and journeys — logged from anywhere you've been</p>
      </header>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-ink">Seven Wonders of the World</h2>
          <span className="text-sm text-ink-soft">{wondersLoggedCount} of 7 logged</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {wonders.map((w) => (
            <WonderCard key={w.id} wonder={w} />
          ))}
        </div>
        {wondersLoggedCount === 7 && (
          <p className="mt-3 text-sm text-wonder font-medium">
            All 7 logged — your combined value from these just doubled, and the Seven Wonders trophy is yours.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold text-lg text-ink mb-3">All Experiences ({all.length})</h2>
        <ListControls
          search={search}
          onSearch={setSearch}
          placeholder="Search landmarks by name or country…"
          sort={sort}
          onSort={setSort}
          sortOptions={SORT_OPTIONS}
        />

        {sorted.length === 0 ? (
          <p className="text-center text-ink-soft py-8">No experiences match your search.</p>
        ) : (
          <div className="plate rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline bg-paper">
                    <th className="px-4 py-3 text-left smallcaps text-ink-soft">Experience</th>
                    <th className="px-4 py-3 text-left smallcaps text-ink-soft">Country</th>
                    <th className="px-4 py-3 text-right smallcaps text-ink-soft">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((exp) => (
                    <tr
                      key={exp.id}
                      className={`border-b border-hairline last:border-0 ${
                        exp.is_new7wonders ? 'bg-wonder/5' : exp.logged ? 'bg-gold/5' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 text-ink">
                        {exp.name}
                        {exp.is_new7wonders && <span className="ml-2 text-xs font-medium text-wonder">Seven Wonders</span>}
                        {!exp.is_new7wonders && exp.is_unesco ? (
                          <span className="ml-2 text-xs font-medium text-ink-soft">UNESCO</span>
                        ) : null}
                        {exp.logged && <span className="ml-2 text-xs text-gold">✓ logged</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <CountryLink code={exp.country_code} name={exp.country_name} tab="experiences" />
                      </td>
                      <td className="px-4 py-2.5 text-right text-ink-soft">
                        {exp.points != null ? `${exp.points} pts` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
