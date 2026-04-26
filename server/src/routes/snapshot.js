import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// GET /api/snapshot — one-shot full dump of reference data + current cursor.
// Clients call this on cold boot, then poll /api/changes?since=<cursor>.
router.get('/', async (req, res) => {
  const [countries, cities, provinces, users_public, user_countries, user_cities, user_provinces, user_subregions, cursorRow] = await Promise.all([
    db('countries').select('*'),
    db('cities').select('*'),
    db('provinces').select('*'),
    // users_public is deliberately minimal: id, identifier, home_country — see
    // docs/db-speed.md. Any extension requires bumping APP_SCHEMA_VERSION.
    db('users').select('id', 'identifier', 'home_country'),
    // User-visit tables ride along so a cold-booting client (or a returning
    // user on a new device) gets a complete picture in one round-trip. Without
    // this, writes that landed before the snapshot cursor would be orphaned:
    // not in the snapshot, and not in changes-since-cursor either.
    db('user_countries').select('id', 'user_id', 'country_code', 'visited_at'),
    db('user_cities').select('id', 'user_id', 'city_id', 'visited_at'),
    db('user_provinces').select('id', 'user_id', 'province_code', 'visited_at'),
    db('user_subregions').select('id', 'user_id', 'subregion'),
    db('_changes').max('change_id as max').first(),
  ]);

  res.json({
    countries,
    cities,
    provinces,
    users_public,
    user_countries,
    user_cities,
    user_provinces,
    user_subregions,
    cursor: (cursorRow && cursorRow.max) || 0,
  });
});

export default router;
