const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

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

// Countries
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

// User Travel Log
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

export function getUserScore(userId, homeCountry) {
  const qs = homeCountry ? `?home_country=${encodeURIComponent(homeCountry)}` : '';
  return request(`/users/${userId}/score${qs}`);
}
