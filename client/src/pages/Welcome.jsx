import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createOrFindUser, getCountries } from '../api/client';

export default function Welcome() {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [countries, setCountries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[Welcome] Fetching countries...');
    getCountries()
      .then((data) => {
        console.log('[Welcome] Got', data.length, 'countries');
        setCountries(data);
      })
      .catch((err) => {
        console.error('[Welcome] Failed to load countries:', err);
        setError('Failed to load countries. Is the server running?');
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) {
      setError('Username must be 3-30 characters (letters, numbers, underscores only).');
      return;
    }
    if (!homeCountry) {
      setError('Please select your home country.');
      return;
    }

    setLoading(true);
    try {
      const user = await createOrFindUser(trimmed, homeCountry);
      setUser(user);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. charlie_adventures"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="home-country" className="block text-sm font-medium text-gray-700 mb-1">
              Home Country
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
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Loading...' : "Let's Go"}
          </button>
        </form>
      </div>
    </div>
  );
}
