import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BottomTabBar from './BottomTabBar';
import ChecklistOverlay from './ChecklistOverlay';
import QuickSearch from './QuickSearch';
import SubTabStrip from './SubTabStrip';
import { publicName } from '../lib/names';
import { IconGear } from './icons/NavIcons';

export default function Layout() {
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { user, logout, db, dbStatus, dbError } = useAuth();
  // Theme-owned wordmark (issue #63): each design system supplies its own
  // logo treatment via the registry slot.
  const { def: themeDef } = useTheme();
  const Logo = themeDef.Logo;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-sans">
      {/* Top bar (issue #65): logo + checklist on the left, search/style/account
          on the right. Section navigation lives in the bottom tab bar instead —
          no hamburger, no dropdown menu to declutter. */}
      <nav aria-label="Top bar" className="bg-panel border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {user && (
              <button
                onClick={() => setChecklistOpen((o) => !o)}
                className="relative p-2.5 text-ink-soft hover:text-compass rounded-lg hover:bg-paper transition-colors shrink-0"
                aria-label="Open explorer checklist"
                aria-expanded={checklistOpen}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
            )}
            <Link to="/dashboard" aria-label="Traveleria — dashboard" className="shrink-0">
              <Logo className="text-2xl" />
            </Link>
          </div>

          <div className="flex items-center gap-3 min-w-0">
            {user && <QuickSearch className="w-24 sm:w-32 focus-within:w-48 transition-all shrink-0" />}
            {/* Style switching moved into Settings (issue #69) — styles are
                earned with points now, so the picker needs the unlock UI. */}
            {user && (
              <>
                <Link
                  to="/settings"
                  className="p-2 text-ink-soft hover:text-compass rounded-lg hover:bg-paper transition-colors shrink-0"
                  aria-label="Settings"
                  title="Settings"
                >
                  <IconGear className="w-5 h-5" />
                </Link>
                <Link
                  to="/settings"
                  className="hidden lg:inline-block text-sm text-ink-soft hover:text-ink border-l border-hairline pl-4 truncate max-w-32"
                  title={`${publicName(user)} — settings`}
                >
                  {publicName(user)}
                </Link>
                <button
                  onClick={logout}
                  className="smallcaps text-sienna hover:text-ink shrink-0"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {user && <SubTabStrip />}

      <ChecklistOverlay isOpen={checklistOpen} onClose={() => setChecklistOpen(false)} />

      {/* Session-only storage (private browsing / OPFS locked by another tab):
          the app works normally — changes still save to the account via the
          API — but nothing is cached on this device between visits. */}
      {db && db.storage === 'memory' && (
        <div role="status" className="bg-gold/10 border-b border-gold/40 text-ink text-sm px-4 py-2 text-center">
          Your travel data can't be stored on this device right now (private browsing, or the app is open in another tab).
          Everything still saves to your account — it just reloads fresh each visit.
        </div>
      )}

      <main className="flex-1">
        {/* Every page gates on dbStatus === 'ready' with a loading spinner, so
            'error' must be handled here or the spinner never resolves — which
            is exactly the endless "Loading your travel data…" bug on browsers
            where the local DB failed to open. */}
        {dbStatus === 'error' ? (
          <div className="max-w-lg mx-auto px-4 py-16 text-center">
            <h1 className="font-display text-xl font-bold text-ink">We couldn't load your travel data</h1>
            <p className="mt-3 text-sm text-ink-soft">
              {(dbError && dbError.message) || 'Something went wrong starting the app on this device.'}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Check your connection and try again. If this keeps happening, closing every Traveleria tab and reopening the site usually clears it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-compass text-paper text-sm font-medium rounded-md hover:bg-compass-deep"
            >
              Try again
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="bg-panel border-t border-hairline py-6">
        <div className="max-w-6xl mx-auto px-4 text-center smallcaps text-ink-soft/70">
          Traveleria &copy; {new Date().getFullYear()} &middot; Estd 2026 &middot; 195 sovereign nations
        </div>
      </footer>

      {/* Spacer so the fixed bottom tab bar never covers the footer or the
          end of a scrolled page. */}
      {user && <div aria-hidden="true" className="h-16" style={{ height: 'calc(4rem + env(safe-area-inset-bottom))' }} />}

      {user && <BottomTabBar />}
    </div>
  );
}
