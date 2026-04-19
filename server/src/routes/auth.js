import express from 'express';
import crypto from 'crypto';
import db from '../db/connection.js';
import {
  signToken,
  hashPassword,
  checkPassword,
  verifyToken,
  extractBearerToken,
} from '../lib/auth.js';
import { signupSchema, signinSchema, validateBody } from '../lib/schemas.js';
import * as changes from '../lib/changes.js';

const router = express.Router();

// Signup/signin return { user, token }. The client stores the token in
// localStorage and sends it as `Authorization: Bearer <token>` on every
// subsequent API call. No cookies — see docs/db-speed.md "Cookies & cross-origin".
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
  res.status(201).json({ user: publicRow, token });
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
  res.json({
    user: { id: user.id, identifier: user.identifier, home_country: user.home_country },
    token,
  });
});

// Bearer tokens are stateless — the client just discards its copy. This route
// stays for symmetry with the UI flow and so the client always has a single
// "where do I sign out?" entry point if we ever add server-side revocation.
router.post('/signout', (_req, res) => {
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = extractBearerToken(req);
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

export default router;
