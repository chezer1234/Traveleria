import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, readLastIdentifier } from '../context/AuthContext';
import { signin, ApiError } from '../api/client';

export default function SignIn() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(() => readLastIdentifier());
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signin({ identifier: identifier.trim(), password });
      setUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-sans px-4">
      <div className="w-full max-w-md plate rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-4xl tracking-tight text-ink mb-2">
            Travel<span className="text-gold">Points</span>
          </h1>
          <p className="text-ink-soft">Welcome back.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-ink mb-1">
              Handle or email
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              className="w-full px-4 py-2.5 border border-hairline bg-panel rounded-md focus:border-compass outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 border border-hairline bg-panel rounded-md focus:border-compass outline-none transition"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-sm bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-compass text-paper font-semibold rounded-md hover:bg-compass-deep disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-6">
          New here?{' '}
          <Link to="/signup" className="text-compass font-medium hover:text-compass-deep">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
