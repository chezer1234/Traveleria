const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET =
  process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-unsafe-secret');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const AUTH_COOKIE = 'auth';
const LAST_IDENTIFIER_COOKIE = 'last_identifier';

// The browser is not trusted to compute any of this. Everything server-side.
function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function checkPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function cookieOpts({ httpOnly }) {
  // Defaults to true in production (Render serves HTTPS). The E2E stack talks plain
  // http://server:3001 inside the compose network, so set COOKIE_SECURE=false there
  // or Playwright (and real browsers) will silently drop the cookie.
  const explicit = process.env.COOKIE_SECURE;
  const secure = explicit !== undefined
    ? explicit === 'true'
    : process.env.NODE_ENV === 'production';
  return {
    httpOnly,
    sameSite: 'lax',
    secure,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
}

function setAuthCookies(res, { token, identifier }) {
  res.cookie(AUTH_COOKIE, token, cookieOpts({ httpOnly: true }));
  res.cookie(LAST_IDENTIFIER_COOKIE, identifier, cookieOpts({ httpOnly: false }));
}

function clearAuthCookie(res) {
  // Keep last_identifier intentionally — the sign-in form should still pre-fill.
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}

module.exports = {
  AUTH_COOKIE,
  LAST_IDENTIFIER_COOKIE,
  TOKEN_TTL_SECONDS,
  signToken,
  verifyToken,
  hashPassword,
  checkPassword,
  setAuthCookies,
  clearAuthCookie,
};
