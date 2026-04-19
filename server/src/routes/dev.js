import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// Truncate everything user-owned and re-run the seed pipeline. Used by E2E setup.
// Mounted only when NODE_ENV !== 'production' (see src/index.js).
router.post('/reset', async (req, res) => {
  try {
    await db.transaction(async (trx) => {
      await trx('user_provinces').del();
      await trx('user_cities').del();
      await trx('user_countries').del();
      await trx('users').del();
    });
    await db.seed.run();
    res.json({ ok: true, reset_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
