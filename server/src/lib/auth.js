const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET =
  process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-only-unsafe-secret');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

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

// Pull the bearer token out of the Authorization header. Used by both
// requireAuth middleware and the GET /api/auth/me handler.
function extractBearerToken(req) {
  const header = req.headers && req.headers.authorization;
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

module.exports = {
  TOKEN_TTL_SECONDS,
  signToken,
  verifyToken,
  hashPassword,
  checkPassword,
  extractBearerToken,
};
