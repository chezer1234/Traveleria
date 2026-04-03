import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddCountries from './pages/AddCountries';
import CountryDetail from './pages/CountryDetail';
import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import Map from './pages/Map';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Welcome />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-countries" element={<AddCountries />} />
        <Route path="/countries/:code" element={<CountryDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/map" element={<Map />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
