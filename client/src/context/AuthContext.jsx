import { createContext, useContext, useState } from 'react';

const SessionContext = createContext(null);

function getOrCreateSessionId() {
  let id = localStorage.getItem('session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('session_id', id);
  }
  return id;
}

export function AuthProvider({ children }) {
  const [sessionId] = useState(getOrCreateSessionId);
  const [homeCountry, setHomeCountry] = useState(null);

  return (
    <SessionContext.Provider value={{ sessionId, homeCountry, setHomeCountry }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
