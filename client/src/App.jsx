import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddCountries from './pages/AddCountries';
import CountryDetail from './pages/CountryDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-countries" element={<AddCountries />} />
            <Route path="/countries/:code" element={<CountryDetail />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
