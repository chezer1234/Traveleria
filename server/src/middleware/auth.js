const { verifyToken, extractBearerToken } = require('../lib/auth');
const db = require('../db/connection');

async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Not signed in' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalid or expired' });

  const user = await db('users')
    .where({ id: payload.sub })
    .select('id', 'identifier', 'home_country')
    .first();
  if (!user) return res.status(401).json({ error: 'User no longer exists' });

  req.user = user;
  next();
}

// Path-param ownership: the ":id" in /api/users/:id MUST equal the signed-in user.
// This is what blocks POST /api/users/<someone_else>/countries.
function requireOwnership(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in' });
    if (req.params[paramName] !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { requireAuth, requireOwnership };
