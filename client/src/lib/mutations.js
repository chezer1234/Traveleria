// Phase 5: optimistic writes.
//
// Every UI mutation flows through here. Each helper:
//   1. Generates a UUID on the client so the optimistic local row and the
//      server row end up with the same PK — the server-echoed _changes row is
//      then an idempotent INSERT OR REPLACE (or a same-id DELETE), not a
//      duplicate.
//   2. Hands a set of `preSteps` SQL statements + the HTTP request shape to
//      db.mutate (see client/src/db/worker.js → handleMutate).
//   3. The worker opens a SAVEPOINT, applies preSteps, awaits fetch, then
//      either RELEASEs the savepoint and fast-forwards _meta.cursor past the
//      returned change_id, or ROLLBACKs on failure.
//
// UI code calls these and then re-reads from the local DB as normal. Because
// the savepoint has already advanced the visible state, reads after the await
// see the new rows on success and the pre-mutation state on failure.

function newId() {
  // crypto.randomUUID is on both Worker and window in every supported browser
  // (Chrome 92+, Safari 15.4+). We use it on the main thread here because we
  // need the UUID in the POST body regardless of savepoint timing.
  return crypto.randomUUID();
}

export async function addCountryOptimistic(db, userId, countryCode) {
  const id = newId();
  const code = (countryCode || '').toUpperCase();
  return db.mutate({
    preSteps: [
      {
        sql: `INSERT INTO user_countries (id, user_id, country_code, visited_at)
                VALUES (?, ?, ?, ?)`,
        bind: [id, userId, code, null],
      },
    ],
    endpoint: `/api/users/${userId}/countries`,
    method: 'POST',
    body: { id, country_code: code },
  });
}

export async function removeCountryOptimistic(db, userId, countryCode) {
  const code = (countryCode || '').toUpperCase();
  // Mirror the server's cascade delete locally so the UI reflects it instantly.
  // The worker DDL has no FK constraints, so we issue the child deletes
  // explicitly. Same-savepoint as the parent delete, so failure rolls back all
  // of them atomically.
  return db.mutate({
    preSteps: [
      {
        sql: `DELETE FROM user_cities
                WHERE user_id = ?
                  AND city_id IN (SELECT id FROM cities WHERE country_code = ?)`,
        bind: [userId, code],
      },
      {
        sql: `DELETE FROM user_provinces
                WHERE user_id = ?
                  AND province_code IN (SELECT code FROM provinces WHERE country_code = ?)`,
        bind: [userId, code],
      },
      {
        sql: `DELETE FROM user_countries WHERE user_id = ? AND country_code = ?`,
        bind: [userId, code],
      },
    ],
    endpoint: `/api/users/${userId}/countries/${code}`,
    method: 'DELETE',
    body: null,
  });
}

export async function addCityOptimistic(db, userId, cityId) {
  const id = newId();
  return db.mutate({
    preSteps: [
      {
        sql: `INSERT INTO user_cities (id, user_id, city_id, visited_at)
                VALUES (?, ?, ?, ?)`,
        bind: [id, userId, cityId, null],
      },
    ],
    endpoint: `/api/users/${userId}/cities`,
    method: 'POST',
    body: { id, city_id: cityId },
  });
}

export async function removeCityOptimistic(db, userId, cityId) {
  return db.mutate({
    preSteps: [
      {
        sql: `DELETE FROM user_cities WHERE user_id = ? AND city_id = ?`,
        bind: [userId, cityId],
      },
    ],
    endpoint: `/api/users/${userId}/cities/${cityId}`,
    method: 'DELETE',
    body: null,
  });
}

export async function addProvinceOptimistic(db, userId, provinceCode) {
  const id = newId();
  return db.mutate({
    preSteps: [
      {
        sql: `INSERT INTO user_provinces (id, user_id, province_code, visited_at)
                VALUES (?, ?, ?, ?)`,
        bind: [id, userId, provinceCode, null],
      },
    ],
    endpoint: `/api/users/${userId}/provinces`,
    method: 'POST',
    body: { id, province_code: provinceCode },
  });
}

export async function removeProvinceOptimistic(db, userId, provinceCode) {
  return db.mutate({
    preSteps: [
      {
        sql: `DELETE FROM user_provinces WHERE user_id = ? AND province_code = ?`,
        bind: [userId, provinceCode],
      },
    ],
    endpoint: `/api/users/${userId}/provinces/${provinceCode}`,
    method: 'DELETE',
    body: null,
  });
}
