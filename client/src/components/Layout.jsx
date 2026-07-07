import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChecklistOverlay from './ChecklistOverlay';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/add-countries', label: 'Add Countries' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/map', label: 'Map' },
  { to: '/subregions', label: 'Subregions' },
  { to: '/trophies', label: 'Trophies' },
  { to: '/groups', label: 'Groups' },
];

const desktopLink = ({ isActive }) =>
  `smallcaps py-1 border-b-2 transition-colors ${
    isActive
      ? 'text-ink border-gold'
      : 'text-ink-soft border-transparent hover:text-ink hover:border-hairline'
  }`;

const mobileLink = ({ isActive }) =>
  `block py-3 smallcaps border-b border-hairline/60 ${
    isActive ? 'text-ink' : 'text-ink-soft hover:text-ink'
  }`;

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { user, logout, db, dbStatus, dbError } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-sans">
      <nav aria-label="Main navigation" className="bg-panel border-b-2 border-ink">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => setChecklistOpen((o) => !o)}
                className="relative p-2.5 text-ink-soft hover:text-compass rounded-lg hover:bg-paper transition-colors"
                aria-label="Open explorer checklist"
                aria-expanded={checklistOpen}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
            )}
            <Link to="/dashboard" className="font-display font-black text-2xl tracking-tight text-ink">
              Travel<span className="text-gold">Points</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={desktopLink}>
                {label}
              </NavLink>
            ))}
            {user && (
              <>
                <span className="text-sm text-ink-soft border-l border-hairline pl-5">{user.identifier}</span>
                <button
                  onClick={logout}
                  className="smallcaps text-sienna hover:text-ink"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2.5 text-ink-soft hover:text-ink"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile nav menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-hairline bg-panel px-4 py-2">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className={mobileLink}>
                {label}
              </NavLink>
            ))}
            {user && (
              <>
                <div className="py-3 text-sm text-ink-soft">{user.identifier}</div>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="block py-3 smallcaps text-sienna hover:text-ink"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>

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
    </div>
  );
}
