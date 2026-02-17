import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="text-xl font-bold text-indigo-600">
            TravelPoints
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
                  Dashboard
                </Link>
                <Link to="/add-countries" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
                  Add Countries
                </Link>
                <Link to="/settings" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
                  Settings
                </Link>
                <span className="text-sm text-gray-500">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Sign up
                </Link>
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
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
                  Dashboard
                </Link>
                <Link to="/add-countries" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
                  Add Countries
                </Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
                  Settings
                </Link>
                <div className="border-t border-gray-100 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500">{user.username}</span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-gray-700 hover:text-indigo-600 text-sm font-medium">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

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
