// @ts-check
const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Stamp every identifier so tests can run repeatedly on the same stack without colliding.
function freshIdentifier(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

test('signup sets httpOnly auth cookie and a non-httpOnly last_identifier cookie', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('signup');

  const res = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'correct-horse-battery-staple', home_country: 'GB' },
  });
  expect(res.status(), await res.text()).toBe(201);

  const body = await res.json();
  expect(body.identifier).toBe(identifier);
  expect(body.home_country).toBe('GB');
  expect(body.id).toBeTruthy();

  // Playwright exposes cookie `httpOnly` so we can assert the shape directly.
  const cookies = await ctx.storageState().then((s) => s.cookies);
  const auth = cookies.find((c) => c.name === 'auth');
  const last = cookies.find((c) => c.name === 'last_identifier');
  expect(auth, 'auth cookie should be set').toBeTruthy();
  expect(auth?.httpOnly).toBe(true);
  expect(last, 'last_identifier cookie should be set').toBeTruthy();
  expect(last?.httpOnly).toBe(false);
  expect(last?.value).toBe(identifier);
});

test('impersonating another user on a write route returns 403', async () => {
  const ctxA = await request.newContext();
  const ctxB = await request.newContext();

  const idA = freshIdentifier('user_a');
  const idB = freshIdentifier('user_b');

  const signupA = await ctxA.post(`${API_URL}/api/auth/signup`, {
    data: { identifier: idA, password: 'a-password-with-enough-chars', home_country: 'GB' },
  });
  expect(signupA.status()).toBe(201);
  const userA = await signupA.json();

  const signupB = await ctxB.post(`${API_URL}/api/auth/signup`, {
    data: { identifier: idB, password: 'another-password-long-enough', home_country: 'FR' },
  });
  expect(signupB.status()).toBe(201);

  // User B tries to add a country as User A. Should be 403, not 401, since B is authed.
  const badWrite = await ctxB.post(`${API_URL}/api/users/${userA.id}/countries`, {
    data: { country_code: 'JP' },
  });
  expect(badWrite.status()).toBe(403);
});

test('malformed write body is rejected with 422 + field-level errors', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('validate');

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'a-password-long-enough', home_country: 'GB' },
  });
  expect(signup.status()).toBe(201);
  const user = await signup.json();

  // Missing country_code entirely.
  const res = await ctx.post(`${API_URL}/api/users/${user.id}/countries`, { data: {} });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(Array.isArray(body.errors)).toBe(true);
  expect(body.errors.length).toBeGreaterThan(0);
  expect(body.errors[0].path).toBe('country_code');
});

test('signout clears auth but keeps last_identifier so the form stays pre-filled', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('signout');

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'one-more-long-password', home_country: 'US' },
  });
  expect(signup.status()).toBe(201);

  const signout = await ctx.post(`${API_URL}/api/auth/signout`);
  expect(signout.status()).toBe(200);

  const cookies = (await ctx.storageState()).cookies;
  const auth = cookies.find((c) => c.name === 'auth');
  const last = cookies.find((c) => c.name === 'last_identifier');
  // clearCookie either removes it or sets it to empty with past expiry; both count.
  expect(!auth || auth.value === '').toBe(true);
  expect(last?.value).toBe(identifier);

  // /api/auth/me now reports 401.
  const me = await ctx.get(`${API_URL}/api/auth/me`);
  expect(me.status()).toBe(401);
});

test('signin round-trips and rejects the wrong password', async () => {
  const setupCtx = await request.newContext();
  const identifier = freshIdentifier('signin');
  const password = 'return-user-long-password';

  const signup = await setupCtx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password, home_country: 'DE' },
  });
  expect(signup.status()).toBe(201);

  const freshCtx = await request.newContext();
  const ok = await freshCtx.post(`${API_URL}/api/auth/signin`, {
    data: { identifier, password },
  });
  expect(ok.status()).toBe(200);

  const badCtx = await request.newContext();
  const bad = await badCtx.post(`${API_URL}/api/auth/signin`, {
    data: { identifier, password: 'completely-wrong' },
  });
  expect(bad.status()).toBe(401);
});
