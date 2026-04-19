const express = require('express');
const db = require('../db/connection');
const { snapshot } = require('../lib/metrics');
const { APP_SCHEMA_VERSION } = require('../lib/schema-version');

const router = express.Router();

// /api/debug/metrics — dev always; prod requires ?token=<DEBUG_TOKEN>.
// Reports route-level timings, _changes size, current max change_id.
router.get('/metrics', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    const expected = process.env.DEBUG_TOKEN;
    if (!expected || req.query.token !== expected) {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  const [changesSize, maxCursor] = await Promise.all([
    db('_changes').count('* as n').first(),
    db('_changes').max('change_id as max').first(),
  ]);

  res.json({
    schema_version: APP_SCHEMA_VERSION,
    uptime_s: Math.round(process.uptime()),
    node: process.version,
    changes: {
      row_count: Number(changesSize.n),
      max_change_id: (maxCursor && maxCursor.max) || 0,
    },
    routes: snapshot(),
  });
});

module.exports = router;
