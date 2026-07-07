import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCountryNamesLocal } from '../lib/queries';

const flag = (code) =>
  code ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

// Global country search (issue #53) — type "Jap…", hit enter, land on Japan.
// Lives in the nav bar; loads the country list lazily on first focus.
export default function QuickSearch({ onNavigate, className = '' }) {
  const { db, dbStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [countries, setCountries] = useState(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef(null);

  async function ensureCountries() {
    if (countries !== null || dbStatus !== 'ready' || !db) return;
    setCountries(await getCountryNamesLocal(db));
  }

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !countries) return [];
    // Name-prefix matches first (typing "in" should surface India before
    // Argentina), then substring and code/region matches.
    const starts = [];
    const rest = [];
    for (const c of countries) {
      const name = c.name.toLowerCase();
      if (name.startsWith(q)) starts.push(c);
      else if (name.includes(q) || c.code.toLowerCase() === q || c.region.toLowerCase().includes(q)) rest.push(c);
    }
    return [...starts, ...rest].slice(0, 8);
  }, [countries, query]);

  function go(country) {
    setQuery('');
    setOpen(false);
    onNavigate?.();
    navigate(`/countries/${country.code}`, { state: { from: location.pathname + location.search } });
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      go(results[highlighted] || results[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-label="Find a country"
        placeholder="Find a country…"
        value={query}
        onFocus={() => { ensureCountries(); setOpen(true); }}
        onChange={(e) => { setQuery(e.target.value); setHighlighted(0); setOpen(true); }}
        onKeyDown={onKeyDown}
        className="w-full border border-hairline bg-paper rounded-md px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-compass"
      />
      {open && query.trim() && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-panel border border-hairline rounded-lg shadow-lg overflow-hidden min-w-56"
        >
          {results.map((c, i) => (
            <li key={c.code} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => go(c)}
                className={`w-full flex items-center gap-2 text-left px-3 py-2.5 text-sm ${
                  i === highlighted ? 'bg-parchment/60 text-ink' : 'text-ink'
                }`}
              >
                <span aria-hidden="true">{flag(c.code)}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-ink-soft/70">{c.region}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-ink-soft">No countries match.</li>
          )}
        </ul>
      )}
    </div>
  );
}
