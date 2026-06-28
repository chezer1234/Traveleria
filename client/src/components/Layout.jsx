import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChecklistOverlay from './ChecklistOverlay';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav aria-label="Main navigation" className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => setChecklistOpen((o) => !o)}
                className="relative p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open explorer checklist"
                aria-expanded={checklistOpen}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
            )}
            <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
              TravelPoints
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Dashboard
            </Link>
            <Link to="/add-countries" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Add Countries
            </Link>
            <Link to="/leaderboard" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Leaderboard
            </Link>
            <Link to="/map" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Map
            </Link>
            <Link to="/subregions" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Subregions
            </Link>
            <Link to="/groups" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
              Groups
            </Link>
            {user && (
              <>
                <span className="text-sm text-gray-500">{user.identifier}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-500 hover:text-red-700 font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
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
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Dashboard
            </Link>
            <Link to="/add-countries" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Add Countries
            </Link>
            <Link to="/leaderboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Leaderboard
            </Link>
            <Link to="/map" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Map
            </Link>
            <Link to="/subregions" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Subregions
            </Link>
            <Link to="/groups" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
              Groups
            </Link>
            {user && (
              <>
                <div className="py-2 text-sm text-gray-500">{user.identifier}</div>
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="block py-2 text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      <ChecklistOverlay isOpen={checklistOpen} onClose={() => setChecklistOpen(false)} />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          TravelPoints &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
