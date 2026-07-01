/**
 * Tier 0 Phase 3 (issue #46): backfills the remaining US states and China
 * provinces/regions with experiences + additional cities, for databases that
 * were already seeded before this migration existed. Fresh databases get
 * everything from the seeds directly.
 *
 * Rather than duplicating ~600 rows of data here (as the Phase 1 pilot
 * migration did), this reads the single source of truth in the seed files
 * (`03_cities.cjs` exports `cities`, `04_province_experiences.cjs` exports
 * `experiences`) and inserts whatever isn't already in the DB.
 */

const path = require('path');
const { cities: ALL_CITIES } = require(path.join(__dirname, '..', 'seeds', '03_cities.cjs'));
const { experiences: ALL_EXPERIENCES } = require(path.join(__dirname, '..', 'seeds', '04_province_experiences.cjs'));

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  const crypto = require('crypto');

  const cityCount = await knex('cities').count('* as count').first();
  if (parseInt(cityCount.count, 10) === 0) {
    console.log('Migration: cities table empty (fresh DB), seeds will handle Tier 0 Phase 3 data.');
    return;
  }

  // --- New additional cities (Phase 3 rollout) ---
  const newCities = ALL_CITIES.filter(c => c.city_type === 'additional');
  const existingCityNames = new Set(
    (await knex('cities')
      .whereIn('name', newCities.map(c => c.name))
      .select('name'))
      .map(r => r.name),
  );
  const citiesToInsert = newCities
    .filter(c => !existingCityNames.has(c.name))
    .map(c => ({ id: crypto.randomUUID(), ...c }));
  if (citiesToInsert.length > 0) {
    const batchSize = 50;
    await knex.transaction(async (trx) => {
      for (let i = 0; i < citiesToInsert.length; i += batchSize) {
        await trx('cities').insert(citiesToInsert.slice(i, i + batchSize));
      }
    });
  }
  console.log(`Migration: inserted ${citiesToInsert.length} Tier 0 Phase 3 cities.`);

  // --- New province experiences (Phase 3 rollout) ---
  const existingExperienceKeys = new Set(
    (await knex('province_experiences').select('province_code', 'name'))
      .map(r => `${r.province_code}|${r.name}`),
  );
  const experiencesToInsert = ALL_EXPERIENCES
    .filter(e => !existingExperienceKeys.has(`${e.province_code}|${e.name}`))
    .map(e => ({ id: crypto.randomUUID(), ...e }));
  if (experiencesToInsert.length > 0) {
    const batchSize = 50;
    await knex.transaction(async (trx) => {
      for (let i = 0; i < experiencesToInsert.length; i += batchSize) {
        await trx('province_experiences').insert(experiencesToInsert.slice(i, i + batchSize));
      }
    });
  }
  console.log(`Migration: inserted ${experiencesToInsert.length} Tier 0 Phase 3 province experiences.`);
};

/**
 * @param {import('knex').Knex} knex
 */
// Note: this matches on the current seed content, which also includes the
// Phase 1 pilot's "additional" cities/experiences — rolling back this
// migration alone (without also rolling back 20260701002) would remove those
// too. Not a concern for the full rollback-and-reapply path migrations.test.js
// exercises; would need scoping if partial rollback ever becomes a real need.
exports.down = async function (knex) {
  const newCities = ALL_CITIES.filter(c => c.city_type === 'additional');
  await knex('cities').whereIn('name', newCities.map(c => c.name)).delete();
  await knex('province_experiences').whereIn('name', ALL_EXPERIENCES.map(e => e.name)).delete();
};
