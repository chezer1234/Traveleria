const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

if (import.meta.env.PROD) {
  console.log('[TravelPoints] API_BASE:', API_BASE);
  console.log('[TravelPoints] VITE_API_URL:', import.meta.env.VITE_API_URL || '(not set)');
}

// Custom error class so callers can render per-field validation feedback from 422s.
export class ApiError extends Error {
  constructor(message, { status, errors } = {}) {
    super(message);
    this.status = status;
    this.errors = errors || [];
  }
}

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 204) return null;

  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  }

  if (!res.ok) {
    throw new ApiError(
      (data && data.error) || `Request failed (${res.status})`,
      { status: res.status, errors: data && data.errors }
    );
  }

  return data;
}

// ---------- Auth ----------

export function signup({ identifier, password, home_country }) {
  return request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, home_country }),
  });
}

export function signin({ identifier, password }) {
  return request('/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function signout() {
  return request('/auth/signout', { method: 'POST' });
}

export function fetchCurrentUser() {
  return request('/auth/me');
}

// ---------- Users ----------

export function getUser(id) {
  return request(`/users/${id}`);
}

// ---------- Reference data ----------

export function getCountries(homeCountry) {
  const qs = homeCountry ? `?home_country=${encodeURIComponent(homeCountry)}` : '';
  return request(`/countries${qs}`);
}

export function getCountry(code, homeCountry) {
  const qs = homeCountry ? `?home_country=${encodeURIComponent(homeCountry)}` : '';
  return request(`/countries/${code}${qs}`);
}

export function getCountryCities(code) {
  return request(`/countries/${code}/cities`);
}

// ---------- User travel log ----------

export function getUserCountries(userId, homeCountry) {
  const qs = homeCountry ? `?home_country=${encodeURIComponent(homeCountry)}` : '';
  return request(`/users/${userId}/countries${qs}`);
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

export function getUserProvinces(userId) {
  return request(`/users/${userId}/provinces`);
}

export function addUserProvince(userId, provinceCode) {
  return request(`/users/${userId}/provinces`, {
    method: 'POST',
    body: JSON.stringify({ province_code: provinceCode }),
  });
}

export function removeUserProvince(userId, provinceCode) {
  return request(`/users/${userId}/provinces/${provinceCode}`, { method: 'DELETE' });
}

export function getUserScore(userId, homeCountry) {
  const qs = homeCountry ? `?home_country=${encodeURIComponent(homeCountry)}` : '';
  return request(`/users/${userId}/score${qs}`);
}

// ---------- Leaderboard ----------

export function getLeaderboard(userId) {
  const qs = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
  return request(`/leaderboard${qs}`);
}
