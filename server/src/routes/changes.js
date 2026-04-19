const express = require('express');
const db = require('../db/connection');

const router = express.Router();
const MAX_BATCH = 1000;

// GET /api/changes?since=N — returns up to MAX_BATCH rows after change_id=N
// plus the cursor to pass on the next request. Clients keep calling until
// cursor stops advancing (or matches the server's max change_id).
router.get('/', async (req, res) => {
  const since = Number.parseInt(req.query.since, 10);
  if (!Number.isFinite(since) || since < 0) {
    return res.status(422).json({
      error: 'Validation failed',
      errors: [{ path: 'since', message: 'must be a non-negative integer' }],
    });
  }

  const rows = await db('_changes')
    .where('change_id', '>', since)
    .orderBy('change_id', 'asc')
    .limit(MAX_BATCH)
    .select('change_id', 'table_name', 'pk', 'op', 'row_json', 'created_at');

  const changes = rows.map((r) => ({
    change_id: r.change_id,
    table: r.table_name,
    pk: r.pk,
    op: r.op,
    row: r.row_json ? JSON.parse(r.row_json) : null,
    created_at: r.created_at,
  }));

  const cursor = changes.length ? changes[changes.length - 1].change_id : since;
  res.json({ changes, cursor, has_more: changes.length === MAX_BATCH });
});

module.exports = router;
