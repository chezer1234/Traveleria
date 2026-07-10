import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { updateUserStyle } from '../api/client';

// The three visual directions from docs/designs — see
// docs/features/user-selectable-styles.md (issue #60).
export const THEMES = [
  { id: 'atlas', name: 'Atlas', tagline: 'Heirloom expedition atlas', swatch: ['#f6f1e7', '#3e5f45', '#c9a227'] },
  { id: 'orbit', name: 'Orbit', tagline: 'Night-flight mission control', swatch: ['#070d18', '#38e1ff', '#d84a86'] },
  { id: 'jetstream', name: 'Jetstream', tagline: 'Bold travel-game energy', swatch: ['#fdfbf7', '#0f9d8f', '#f59e0b'] },
];

const THEME_IDS = THEMES.map((t) => t.id);
const STORAGE_KEY = 'traveleria.style';
// Page background per style, mirrored to <meta name="theme-color"> so the
// browser chrome matches (mobile address bar etc.).
const PAGE_COLOR = { atlas: '#f6f1e7', orbit: '#070d18', jetstream: '#fdfbf7' };

function readStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return THEME_IDS.includes(v) ? v : 'atlas';
  } catch {
    return 'atlas';
  }
}

// Must mirror the pre-paint script in index.html: no attribute = Atlas.
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'atlas') delete root.dataset.theme;
  else root.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = PAGE_COLOR[theme];
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
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
