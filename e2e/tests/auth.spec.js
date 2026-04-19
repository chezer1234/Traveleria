// @ts-check
const { test, expect, request } = require('@playwright/test');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Stamp every identifier so tests can run repeatedly on the same stack without colliding.
function freshIdentifier(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

test('signup returns a JWT bearer token alongside the user', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('signup');

  const res = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'correct-horse-battery-staple', home_country: 'GB' },
  });
  expect(res.status(), await res.text()).toBe(201);

  const body = await res.json();
  expect(body.user.identifier).toBe(identifier);
  expect(body.user.home_country).toBe('GB');
  expect(body.user.id).toBeTruthy();
  expect(typeof body.token).toBe('string');
  // JWTs are three base64url segments separated by dots.
  expect(body.token.split('.')).toHaveLength(3);

  // No auth cookies — bearer tokens travel in the Authorization header.
  const cookies = (await ctx.storageState()).cookies;
  expect(cookies.find((c) => c.name === 'auth')).toBeUndefined();

  // The token actually authenticates a follow-up request.
  const me = await ctx.get(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  expect(me.status()).toBe(200);
  expect((await me.json()).id).toBe(body.user.id);
});

test('impersonating another user on a write route returns 403', async () => {
  const ctx = await request.newContext();
  const idA = freshIdentifier('user_a');
  const idB = freshIdentifier('user_b');

  const signupA = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier: idA, password: 'a-password-with-enough-chars', home_country: 'GB' },
  });
  expect(signupA.status()).toBe(201);
  const a = await signupA.json();

  const signupB = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier: idB, password: 'another-password-long-enough', home_country: 'FR' },
  });
  expect(signupB.status()).toBe(201);
  const b = await signupB.json();

  // User B tries to add a country as User A. Should be 403, not 401, since B is authed.
  const badWrite = await ctx.post(`${API_URL}/api/users/${a.user.id}/countries`, {
    data: { country_code: 'JP' },
    headers: { Authorization: `Bearer ${b.token}` },
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
  const { user, token } = await signup.json();

  // Missing country_code entirely.
  const res = await ctx.post(`${API_URL}/api/users/${user.id}/countries`, {
    data: {},
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(Array.isArray(body.errors)).toBe(true);
  expect(body.errors.length).toBeGreaterThan(0);
  expect(body.errors[0].path).toBe('country_code');
});

test('unauthenticated writes return 401, not 403', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('noauth');
  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password: 'unauth-test-password', home_country: 'GB' },
  });
  expect(signup.status()).toBe(201);
  const { user } = await signup.json();

  // No Authorization header → 401, not 403.
  const res = await ctx.post(`${API_URL}/api/users/${user.id}/countries`, {
    data: { country_code: 'JP' },
  });
  expect(res.status()).toBe(401);
});

test('signin round-trips and rejects the wrong password', async () => {
  const ctx = await request.newContext();
  const identifier = freshIdentifier('signin');
  const password = 'return-user-long-password';

  const signup = await ctx.post(`${API_URL}/api/auth/signup`, {
    data: { identifier, password, home_country: 'DE' },
  });
  expect(signup.status()).toBe(201);

  const ok = await ctx.post(`${API_URL}/api/auth/signin`, {
    data: { identifier, password },
  });
  expect(ok.status()).toBe(200);
  const okBody = await ok.json();
  expect(typeof okBody.token).toBe('string');
  expect(okBody.user.identifier).toBe(identifier);

  const bad = await ctx.post(`${API_URL}/api/auth/signin`, {
    data: { identifier, password: 'completely-wrong' },
  });
  expect(bad.status()).toBe(401);
});
