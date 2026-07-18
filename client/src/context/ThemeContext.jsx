import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { updateUserStyle } from '../api/client';
import { getUserScoreLocal } from '../lib/queries';
import { isStyleUnlocked } from '../lib/styleUnlocks';
import { THEMES, DEFAULT_THEME_ID, getThemeDef } from '../themes/registry';

// The user-selectable design systems (issues #60/#63). The registry in
// src/themes/ owns the theme list and each theme's component slots; this
// context owns which one is active and how the choice persists.
//
// Unlockable styles (issue #69): non-default styles cost Travel Points
// (lib/styleUnlocks.js). This context tracks the signed-in user's points and
// refuses to switch to a locked style — the server's PUT /users/:id/style
// gate is the real gatekeeper; this is the UI-side mirror.
export { THEMES };

const THEME_IDS = THEMES.map((t) => t.id);
const STORAGE_KEY = 'traveleria.style';

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEME_IDS.includes(v) ? v : DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

// Must mirror the pre-paint script in index.html: no attribute = the default
// (Atlas); any other id becomes the data-theme attribute.
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME_ID) delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  // Mirror the page background to <meta name="theme-color"> so the browser
  // chrome matches (mobile address bar etc.).
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = getThemeDef(theme).pageColor;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, db, dbStatus } = useAuth();
  const [theme, setThemeState] = useState(readStoredTheme);
  // The user's Travel Points for unlock checks; null = not loaded yet
  // (treated as 0, so only always-available styles can be picked).
  const [stylePoints, setStylePoints] = useState(null);
  // Only adopt the account preference when the signed-in user changes — not on
  // every user-object refresh, or a stale fetch could undo a fresh local pick.
  const adoptedForUser = useRef(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Account preference wins on sign-in: it's the cross-device setting.
  // A user with no saved style (null) keeps whatever this device shows.
  // No unlock re-check here on purpose (issue #69): existing selections are
  // never migrated or reverted — only *changing* style is gated.
  useEffect(() => {
    if (!user) {
      adoptedForUser.current = null;
      return;
    }
    if (adoptedForUser.current === user.id) return;
    adoptedForUser.current = user.id;
    if (user.style && THEME_IDS.includes(user.style)) {
      setThemeState(user.style);
    }
  }, [user]);

  const refreshStylePoints = useCallback(async () => {
    if (!user || !db || dbStatus !== 'ready') return null;
    try {
      const score = await getUserScoreLocal(db, user.id, user.home_country);
      setStylePoints(score.totalPoints);
      return score.totalPoints;
    } catch {
      return null;
    }
  }, [user, db, dbStatus]);

  // Load points once the local DB is ready; Settings re-calls
  // refreshStylePoints on mount so a fresh trip counts immediately.
  useEffect(() => {
    if (dbStatus === 'ready') refreshStylePoints();
    else setStylePoints(null);
  }, [dbStatus, refreshStylePoints]);

  function setTheme(next) {
    if (!THEME_IDS.includes(next)) return;
    const def = getThemeDef(next);
    if (def.unlock && !isStyleUnlocked(next, stylePoints)) return;
    setThemeState(next);
    // Fire-and-forget: the device already switched; the account write is a
    // best-effort sync (offline/guest users still get the local switch).
    if (user) updateUserStyle(user.id, next).catch(() => {});
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        def: getThemeDef(theme),
        stylePoints,
        refreshStylePoints,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
