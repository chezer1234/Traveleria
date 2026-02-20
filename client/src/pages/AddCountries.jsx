import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCountries, getUserCountries, addUserCountry } from '../api/client';

export default function AddCountries() {
  const { sessionId, homeCountry } = useAuth();
  const navigate = useNavigate();
  const [allCountries, setAllCountries] = useState([]);
  const [visitedCodes, setVisitedCodes] = useState(new Set());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [countries, visited] = await Promise.all([
          getCountries(homeCountry),
          getUserCountries(sessionId, homeCountry),
        ]);
        setAllCountries(countries);
        setVisitedCodes(new Set(visited.map((v) => v.country_code)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, homeCountry]);

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
      const promises = [...selected].map((code) => addUserCountry(sessionId, code));
      await Promise.all(promises);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="loading-spinner" aria-hidden="true"></div>
        <p className="text-gray-500 text-sm">Loading countries...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Countries</h1>
        {selected.size > 0 && (
          <button
            onClick={handleAddSelected}
            disabled={submitting}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting
              ? 'Adding...'
              : `Add ${selected.size} ${selected.size === 1 ? 'country' : 'countries'}`}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search countries by name, code, or region..."
          aria-label="Search countries"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Country list */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const isVisited = visitedCodes.has(c.code);
          const isSelected = selected.has(c.code);
          return (
            <button
              key={c.code}
              onClick={() => !isVisited && toggleSelect(c.code)}
              disabled={isVisited}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                isVisited
                  ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                  : isSelected
                  ? 'bg-indigo-50 border-indigo-300'
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3">
                <div className="min-w-0">
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="text-gray-400 text-sm ml-2">{c.code}</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">{c.region}</span>
                  <span className="text-sm text-gray-600">{c.baseline_points} pts</span>
                  {isVisited && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Visited
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">No countries match your search.</p>
        )}
      </div>
    </div>
  );
}
