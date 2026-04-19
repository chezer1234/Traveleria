const express = require('express');
const crypto = require('crypto');
const db = require('../db/connection');
const {
  signToken,
  hashPassword,
  checkPassword,
  setAuthCookies,
  clearAuthCookie,
  AUTH_COOKIE,
  verifyToken,
} = require('../lib/auth');
const { signupSchema, signinSchema, validateBody } = require('../lib/schemas');
const changes = require('../lib/changes');

const router = express.Router();

router.post('/signup', validateBody(signupSchema), async (req, res) => {
  const { identifier, password, home_country } = req.body;

  const country = await db('countries').where({ code: home_country }).first();
  if (!country) {
    return res.status(422).json({
      error: 'Validation failed',
      errors: [{ path: 'home_country', message: 'Unknown country code' }],
    });
  }

  const clash = await db('users')
    .whereRaw('LOWER(identifier) = LOWER(?)', [identifier])
    .first();
  if (clash) {
    return res.status(422).json({
      error: 'Validation failed',
      errors: [{ path: 'identifier', message: 'Already taken' }],
    });
  }

  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);

  // Only the public shape goes into the change feed — never the password hash.
  const publicRow = { id, identifier, home_country };

  await db.transaction(async (trx) => {
    await trx('users').insert({ id, identifier, password_hash, home_country });
    await changes.record(trx, { table: 'users', pk: id, op: 'insert', row: publicRow });
  });

  const token = signToken(id);
  setAuthCookies(res, { token, identifier });
  res.status(201).json(publicRow);
});

router.post('/signin', validateBody(signinSchema), async (req, res) => {
  const { identifier, password } = req.body;

  const user = await db('users')
    .whereRaw('LOWER(identifier) = LOWER(?)', [identifier])
    .first();
  // Constant-ish timing: always run bcrypt, even when user is missing, so
  // attackers can't use response latency to enumerate identifiers.
  const hash = user ? user.password_hash : '$2a$12$0000000000000000000000000000000000000000000000000000';
  const ok = await checkPassword(password, hash);

  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid identifier or password' });
  }

  const token = signToken(user.id);
  setAuthCookies(res, { token, identifier: user.identifier });
  res.json({ id: user.id, identifier: user.identifier, home_country: user.home_country });
});

router.post('/signout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = req.cookies && req.cookies[AUTH_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Session invalid or expired' });

  const user = await db('users')
    .where({ id: payload.sub })
    .select('id', 'identifier', 'home_country')
    .first();
  if (!user) return res.status(401).json({ error: 'User no longer exists' });

  res.json(user);
});

module.exports = router;
