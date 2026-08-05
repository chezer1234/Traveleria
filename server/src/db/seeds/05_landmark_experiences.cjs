/**
 * Seed: landmark_experiences
 * Experience Update (issue #74). Landmarks/wonders for every country outside
 * Tier 0 (US/China already have their own province_experiences — see
 * 04_province_experiences.cjs, and the Great Wall at Badaling there is
 * flagged is_new7wonders/is_unesco so it joins this table's rows in the
 * Seven Wonders showcase).
 *
 * This is a STARTER SET, not an exhaustive catalog — the 6 New7Wonders
 * that aren't Tier 0, plus a handful of other real, well-documented
 * landmarks across tiers/regions. Catalog build-out continues incrementally;
 * see docs/features/experience-update.md.
 *
 * significance_pct is derived by hand here from the designation x
 * visitor-volume matrix in points.js (getLandmarkSignificancePct) — kept in
 * sync manually since seed data is static, not computed at insert time.
 * Visitor figures are secondary-sourced (aggregator summaries) per the
 * doc's own caveat — good enough to seed the mechanism, not a substitute
 * for a primary-source pull (site management authority / national tourism
 * board) before this ships widely.
 */

const experiences = [
  // ── New7Wonders (2007 public vote) — 6 of the 7; the Great Wall is Tier 0 ──
  {
    country_code: 'PE', province_code: null, name: 'Machu Picchu',
    description: 'Inca citadel high in the Andes, rediscovered in 1911.',
    is_new7wonders: true, is_unesco: true, annual_visitors: 1500000, significance_pct: 5,
  },
  {
    country_code: 'IN', province_code: null, name: 'Taj Mahal',
    description: 'White marble mausoleum in Agra, built by Shah Jahan.',
    is_new7wonders: true, is_unesco: true, annual_visitors: 7000000, significance_pct: 4,
  },
  {
    country_code: 'JO', province_code: null, name: 'Petra',
    description: 'Rock-cut city carved into rose-red sandstone cliffs.',
    is_new7wonders: true, is_unesco: true, annual_visitors: 1000000, significance_pct: 5,
  },
  {
    country_code: 'BR', province_code: null, name: 'Christ the Redeemer',
    description: 'Art Deco statue overlooking Rio de Janeiro from Corcovado.',
    is_new7wonders: true, is_unesco: true, annual_visitors: 2000000, significance_pct: 5,
  },
  {
    country_code: 'MX', province_code: null, name: 'Chichen Itza',
    description: "Maya city and the step pyramid El Castillo, Yucatan.",
    is_new7wonders: true, is_unesco: true, annual_visitors: 2600000, significance_pct: 5,
  },
  {
    country_code: 'IT', province_code: null, name: 'Colosseum',
    description: "Ancient Rome's largest amphitheatre.",
    is_new7wonders: true, is_unesco: true, annual_visitors: 7600000, significance_pct: 4,
  },

  // ── Other real, well-documented landmarks (UNESCO-only or unflagged) ────
  {
    country_code: 'EG', province_code: null, name: 'Pyramids of Giza',
    description: "The last-standing Seven Wonders of the Ancient World — honorary status, not on the modern New7Wonders list.",
    is_new7wonders: false, is_unesco: true, annual_visitors: 3000000, significance_pct: 3,
  },
  {
    country_code: 'KH', province_code: null, name: 'Angkor Wat',
    description: "World's largest religious monument, Khmer Empire temple complex.",
    is_new7wonders: false, is_unesco: true, annual_visitors: 2500000, significance_pct: 3,
  },
  {
    country_code: 'AU', province_code: null, name: 'Uluru',
    description: 'Sacred sandstone monolith in the Red Centre, Anangu land.',
    is_new7wonders: false, is_unesco: true, annual_visitors: 300000, significance_pct: 3,
  },
  {
    country_code: 'AR', province_code: null, name: 'Iguazu Falls',
    description: 'Vast waterfall system on the Argentina-Brazil border.',
    is_new7wonders: false, is_unesco: true, annual_visitors: 1500000, significance_pct: 3,
  },
  {
    country_code: 'JP', province_code: 'JP-13', name: 'Tokyo Skytree',
    description: 'Broadcasting and observation tower, tallest structure in Japan.',
    is_new7wonders: false, is_unesco: false, annual_visitors: 6000000, significance_pct: 1,
  },
];

exports.seed = async function (knex) {
  const crypto = require('crypto');

  const existing = await knex('landmark_experiences').count('* as count').first();
  if (parseInt(existing.count, 10) > 0) {
    console.log('Landmark experiences already seeded, skipping.');
    return;
  }

  const rows = experiences.map(e => ({ id: crypto.randomUUID(), ...e }));
  await knex('landmark_experiences').insert(rows);
  console.log(`Seeded ${rows.length} landmark experiences.`);
};

exports.experiences = experiences;
