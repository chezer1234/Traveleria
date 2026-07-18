import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import AddCountries from './pages/AddCountries';
import CountryDetail from './pages/CountryDetail';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Leaderboard from './pages/Leaderboard';
import Map from './pages/Map';
import Subregions from './pages/Subregions';
import Territory from './pages/Territory';
import StateBattle from './pages/StateBattle';
import Groups from './pages/Groups';
import GroupBattle from './pages/GroupBattle';
import Trophies from './pages/Trophies';
import Settings from './pages/Settings';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="loading-spinner" aria-hidden="true"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* The map is the landing page (issue #69). */}
        <Route path="/" element={<Navigate to="/map" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add-countries" element={<AddCountries />} />
        <Route path="/countries/:code" element={<CountryDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/territory/:userId" element={<Territory />} />
        <Route path="/state-battle/:userId/:countryCode" element={<StateBattle />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/:groupId" element={<GroupBattle />} />
        <Route path="/map" element={<Map />} />
        <Route path="/subregions" element={<Subregions />} />
        <Route path="/trophies" element={<Trophies />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </HashRouter>
  );
}
