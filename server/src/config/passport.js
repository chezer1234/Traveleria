const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const db = require('../db/connection');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${SERVER_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;
        const displayName = profile.displayName || '';
        const avatarUrl = profile.photos?.[0]?.value || null;

        // Try to find by google_id first, then by email
        let user = await db('users').where({ google_id: googleId }).first();

        if (!user && email) {
          user = await db('users').where({ email }).first();
        }

        if (user) {
          // Update google_id and avatar if missing
          const updates = {};
          if (!user.google_id) updates.google_id = googleId;
          if (!user.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
          if (Object.keys(updates).length > 0) {
            await db('users').where({ id: user.id }).update(updates);
            user = { ...user, ...updates };
          }
        } else {
          // Create new user from Google profile
          // Derive a unique username from display name
          let baseUsername = displayName
            .replace(/[^a-zA-Z0-9_]/g, '')
            .slice(0, 28) || 'user';
          if (baseUsername.length < 2) baseUsername = 'user';

          let username = baseUsername;
          let suffix = 1;
          while (await db('users').where({ username }).first()) {
            username = `${baseUsername}${suffix}`;
            suffix++;
          }

          const [created] = await db('users')
            .insert({
              username,
              email: email || null,
              password_hash: null,
              google_id: googleId,
              avatar_url: avatarUrl,
            })
            .returning(['id', 'username', 'email', 'home_country', 'created_at', 'avatar_url', 'google_id']);

          user = created;
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// We're using JWT (stateless) — no session serialization needed
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
