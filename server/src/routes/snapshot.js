const express = require('express');
const db = require('../db/connection');

const router = express.Router();

// GET /api/snapshot — one-shot full dump of reference data + current cursor.
// Clients call this on cold boot, then poll /api/changes?since=<cursor>.
router.get('/', async (req, res) => {
  const [countries, cities, provinces, users_public, cursorRow] = await Promise.all([
    db('countries').select('*'),
    db('cities').select('*'),
    db('provinces').select('*'),
    // users_public is deliberately minimal: id, identifier, home_country — see
    // docs/db-speed.md. Any extension requires bumping APP_SCHEMA_VERSION.
    db('users').select('id', 'identifier', 'home_country'),
    db('_changes').max('change_id as max').first(),
  ]);

  res.json({
    countries,
    cities,
    provinces,
    users_public,
    cursor: (cursorRow && cursorRow.max) || 0,
  });
});

module.exports = router;
