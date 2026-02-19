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

  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

// Auth
export function getAuthConfig() {
  return request('/auth/config');
}

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

// User Settings
export function getUserProfile(userId) {
  return request(`/users/${userId}/profile`);
}

export function updateUserProfile(userId, updates) {
  return request(`/users/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function changePassword(userId, currentPassword, newPassword) {
  return request(`/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
