import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup, ApiError } from '../api/client';

// Pre-signin we have no local DB, so the country dropdown is sourced from
// /api/snapshot — a public, read-only endpoint that's also the cold-boot
// payload for authenticated users. Saves us keeping the old /api/countries
// list route around just for one dropdown.
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export default function SignUp() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/snapshot`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('snapshot ' + r.status)))
      .then((s) => {
        const list = [...(s.countries || [])].sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch(() => setError('Failed to load countries. Is the server running?'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      const user = await signup({
        identifier: identifier.trim(),
        password,
        home_country: homeCountry,
      });
      setUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors.length) {
        const byField = {};
        for (const e of err.errors) byField[e.path] = e.message;
        setFieldErrors(byField);
        setError('Please fix the highlighted fields.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">TravelPoints</h1>
          <p className="text-gray-500">Track your travels. Earn points. See the world.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1">
              Handle or email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. charlie_adventures"
              autoComplete="username"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              autoFocus
            />
            {fieldErrors.identifier && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.identifier}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
            {fieldErrors.password && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="home-country" className="block text-sm font-medium text-gray-700 mb-1">
              Home country
            </label>
            <select
              id="home-country"
              value={homeCountry}
              onChange={(e) => setHomeCountry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white"
            >
              <option value="">Select your country...</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.home_country && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.home_country}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating account…' : "Let's Go"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/signin" className="text-indigo-600 font-medium hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
