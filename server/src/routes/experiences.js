import express from 'express';
import db from '../db/connection.js';

const router = express.Router();

// GET /api/experiences/seven-wonders — the New7Wonders showcase (Experience
// Update, issue #74). Sourced from two tables: landmark_experiences (every
// non-Tier-0 wonder) and province_experiences (the Great Wall at Badaling,
// which lives under China's Tier 0 schema instead) — unioned here so the
// global Experiences tab can render all 7 together regardless of which
// table backs them. See "Seven Wonders showcase" in
// docs/features/experience-update.md.
router.get('/seven-wonders', async (req, res) => {
  const landmarks = await db('landmark_experiences')
    .where({ is_new7wonders: true })
    .select('id', 'name', 'description', 'country_code', db.raw("null as province_code"), 'photo_url', 'photo_credit');

  const provinceRows = await db('province_experiences')
    .join('provinces', 'province_experiences.province_code', 'provinces.code')
    .where({ 'province_experiences.is_new7wonders': true })
    .select(
      'province_experiences.id', 'province_experiences.name', 'province_experiences.description',
      'provinces.country_code', 'province_experiences.province_code',
      db.raw('null as photo_url'), db.raw('null as photo_credit'),
    );

  res.json([...landmarks, ...provinceRows]);
});

export default router;
