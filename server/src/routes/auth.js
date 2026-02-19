const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('../config/passport');
const db = require('../db/connection');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { password, home_country } = req.body;
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be between 2 and 30 characters' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check for existing user
    const existing = await db('users')
      .where({ email })
      .orWhere({ username })
      .first();

    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      return res.status(409).json({ error: `A user with that ${field} already exists` });
    }

    // Validate home_country if provided
    if (home_country) {
      const country = await db('countries').where({ code: home_country }).first();
      if (!country) {
        return res.status(400).json({ error: 'Invalid home_country code' });
      }
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db('users')
      .insert({
        username,
        email,
        password_hash,
        home_country: home_country || null,
      })
      .returning(['id', 'username', 'email', 'home_country', 'created_at']);

    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        home_country: user.home_country,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout — client-side token removal (stateless JWT)
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

const googleOAuthEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

function requireGoogleOAuth(req, res, next) {
  if (!googleOAuthEnabled) {
    return res.status(501).json({ error: 'Google OAuth is not configured on this server' });
  }
  next();
}

// GET /api/auth/google — initiate Google OAuth flow
router.get(
  '/google',
  requireGoogleOAuth,
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback — Google redirects here after consent
router.get(
  '/google/callback',
  requireGoogleOAuth,
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const user = req.user;
    const token = generateToken(user);
    const userPayload = Buffer.from(
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        home_country: user.home_country,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      })
    ).toString('base64');

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userPayload}`);
  }
);

module.exports = router;
