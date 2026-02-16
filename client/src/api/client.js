const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

// Auth
export function register(body) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export function login(body) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

// Countries
export function getCountries() {
  return request('/countries');
}

export function getCountry(code) {
  return request(`/countries/${code}`);
}

export function getCountryCities(code) {
  return request(`/countries/${code}/cities`);
}

// User Travel Log
export function getUserCountries(userId) {
  return request(`/users/${userId}/countries`);
}

export function addUserCountry(userId, countryCode) {
  return request(`/users/${userId}/countries`, {
    method: 'POST',
    body: JSON.stringify({ country_code: countryCode }),
  });
}

export function removeUserCountry(userId, code) {
  return request(`/users/${userId}/countries/${code}`, { method: 'DELETE' });
}

export function addUserCity(userId, cityId) {
  return request(`/users/${userId}/cities`, {
    method: 'POST',
    body: JSON.stringify({ city_id: cityId }),
  });
}

export function removeUserCity(userId, cityId) {
  return request(`/users/${userId}/cities/${cityId}`, { method: 'DELETE' });
}

export function getUserScore(userId) {
  return request(`/users/${userId}/score`);
}
