import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addCountryOptimistic } from '../lib/mutations';
import { getCountriesLocal } from '../lib/queries';
import CountryLink from '../components/CountryLink';

export default function AddCountries() {
  const { user, db, dbStatus } = useAuth();
  const homeCountry = user.home_country;
  const navigate = useNavigate();
  const [allCountries, setAllCountries] = useState([]);
  const [visitedCodes, setVisitedCodes] = useState(new Set());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (dbStatus !== 'ready' || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const [countries, visitedRows] = await Promise.all([
          getCountriesLocal(db, homeCountry),
          db.all(`SELECT country_code FROM user_countries WHERE user_id = ?`, [user.id]),
        ]);
        if (cancelled) return;
        setAllCountries(countries);
        setVisitedCodes(new Set(visitedRows.map((v) => v.country_code)));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [db, dbStatus, user.id, homeCountry]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allCountries;
    const q = search.toLowerCase();
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
    );
  }, [allCountries, search]);

  function toggleSelect(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  async function handleAddSelected() {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');

    try {
      // Mutations serialise in the worker's txLock, but the local INSERT in
      // each savepoint lands instantly. Kicking them off with Promise.all keeps
      // the queue tight without juggling ordering.
      const promises = [...selected].map((code) => addCountryOptimistic(db, user.id, code));
      await Promise.all(promises);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || dbStatus !== 'ready') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-ink-soft text-sm">Loading countries...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-ink">Add Countries</h1>
        {selected.size > 0 && (
          <button
            onClick={handleAddSelected}
            disabled={submitting}
            className="bg-compass text-paper px-5 py-2 rounded-md text-sm font-medium hover:bg-compass-deep disabled:opacity-50"
          >
            {submitting
              ? 'Adding...'
              : `Add ${selected.size} ${selected.size === 1 ? 'country' : 'countries'}`}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">{error}</div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search countries by name, code, or region..."
          aria-label="Search countries"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-hairline bg-panel rounded-md px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-compass"
        />
      </div>

      {/* Country list */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const isVisited = visitedCodes.has(c.code);
          const isSelected = selected.has(c.code);
          return (
            <div
              key={c.code}
              className={`flex items-stretch rounded-lg border transition-colors ${
                isVisited
                  ? 'bg-paper border-hairline opacity-60'
                  : isSelected
                  ? 'bg-atlas/10 border-atlas/40'
                  : 'bg-panel border-hairline hover:border-compass'
              }`}
            >
              <button
                onClick={() => !isVisited && toggleSelect(c.code)}
                disabled={isVisited}
                className={`flex-1 min-w-0 text-left px-4 py-3 ${isVisited ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-ink-soft/70 text-sm ml-2">{c.code}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span className="text-xs text-ink-soft">{c.region}</span>
                    <span className="text-sm text-ink-soft tabular-nums">{c.baseline_points} pts</span>
                    {isVisited && (
                      <span className="text-xs bg-parchment text-ink-soft px-2 py-0.5 rounded-full">
                        Visited
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-xs bg-atlas/15 text-atlas-deep border border-atlas/40 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {/* Peek at the country before adding it (issue #53) */}
              <CountryLink
                code={c.code}
                className="flex items-center px-3 smallcaps text-compass hover:text-compass-deep border-l border-hairline/60"
              >
                View
              </CountryLink>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-ink-soft py-8">No countries match your search.</p>
        )}
      </div>
    </div>
  );
}
