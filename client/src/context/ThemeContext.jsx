import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { updateUserStyle } from '../api/client';
import { THEMES, DEFAULT_THEME_ID, getThemeDef } from '../themes/registry';

// The user-selectable design systems (issues #60/#63). The registry in
// src/themes/ owns the theme list and each theme's component slots; this
// context owns which one is active and how the choice persists.
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
  const { user } = useAuth();
  const [theme, setThemeState] = useState(readStoredTheme);
  // Only adopt the account preference when the signed-in user changes — not on
  // every user-object refresh, or a stale fetch could undo a fresh local pick.
  const adoptedForUser = useRef(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Account preference wins on sign-in: it's the cross-device setting.
  // A user with no saved style (null) keeps whatever this device shows.
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

  function setTheme(next) {
    if (!THEME_IDS.includes(next)) return;
    setThemeState(next);
    // Fire-and-forget: the device already switched; the account write is a
    // best-effort sync (offline/guest users still get the local switch).
    if (user) updateUserStyle(user.id, next).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, def: getThemeDef(theme) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
