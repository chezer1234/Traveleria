import { createContext, useContext, useState, useEffect } from 'react';
import { fetchCurrentUser, signout as apiSignout } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" distinguishes first-load "we don't know yet" from "definitely signed out",
  // so the signin page doesn't flash before the /me call resolves.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    try {
      await apiSignout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Read the non-httpOnly last_identifier cookie to pre-fill the sign-in form.
// Lives here because the auth flow is the only consumer.
export function readLastIdentifier() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)last_identifier=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
