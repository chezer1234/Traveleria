import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchCurrentUser, signout as apiSignout, getAuthToken, getLastIdentifier } from '../api/client';
import { openUserDb, closeUserDb } from '../db/local';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // DB status flows: 'idle' → 'loading' → 'ready' | 'error'.
  // Pages that need local SQL (Phase 4+) should wait for 'ready'.
  const [db, setDb] = useState(null);
  const [dbStatus, setDbStatus] = useState('idle');
  const [dbError, setDbError] = useState(null);
  // Track the current user id so overlapping open/close calls don't race.
  const activeUserId = useRef(null);

  useEffect(() => {
    // Skip the network round-trip when there's no token in localStorage —
    // common case is "first visit" or "post-signout".
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Open/close the OPFS DB as the user flips between signed-in/out. Depends on
  // user only — setting dbStatus from inside must NOT re-trigger the effect
  // (otherwise a failing init loops forever).
  useEffect(() => {
    if (!user) {
      if (activeUserId.current) {
        closeUserDb(activeUserId.current);
        activeUserId.current = null;
      }
      setDb(null);
      setDbStatus('idle');
      setDbError(null);
      if (typeof window !== 'undefined') delete window.__traveleria;
      return;
    }

    if (activeUserId.current === user.id) return;

    let cancelled = false;
    activeUserId.current = user.id;
    setDbStatus('loading');
    setDbError(null);

    openUserDb(user.id, API_BASE, getAuthToken())
      .then((entry) => {
        if (cancelled) return;
        setDb(entry);
        setDbStatus('ready');
        if (typeof window !== 'undefined') {
          window.__traveleria = {
            ready: true,
            schemaVersion: import.meta.env.VITE_APP_SCHEMA_VERSION || 'dev',
            userId: user.id,
            // Probes are async now — sqlite-wasm lives in a Worker (see db/worker.js).
            countCountries: () => entry.value('SELECT COUNT(*) FROM countries'),
            countCities: () => entry.value('SELECT COUNT(*) FROM cities'),
            countProvinces: () => entry.value('SELECT COUNT(*) FROM provinces'),
            cursor: async () => {
              const v = await entry.value(`SELECT value FROM _meta WHERE key = 'cursor'`);
              return Number(v || 0);
            },
          };
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[AuthContext] failed to open local DB', err);
        setDbStatus('error');
        setDbError(err);
        // Expose the error for E2E diagnostics so the probe can show WHY.
        if (typeof window !== 'undefined') {
          window.__traveleriaError = { message: err && err.message, stack: err && err.stack };
        }
      });

    return () => { cancelled = true; };
    // Depend on user?.id, not the user object: fetchCurrentUser runs twice under
    // StrictMode, and each resolve produces a new reference with the same id.
    // Using [user] would cancel the first openUserDb and then the activeUserId
    // guard would skip retrying, leaving __traveleria unset forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function logout() {
    try {
      await apiSignout();
    } finally {
      setUser(null);
      if (typeof window !== 'undefined') delete window.__traveleria;
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading, db, dbStatus, dbError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function readLastIdentifier() {
  return getLastIdentifier();
}
