/**
 * Schema for the Experience Update (issue #74): generalizes Tier 0's
 * province-experience mechanic into a global system, plus two new
 * experience types that don't fit the province-scoped model — transport
 * and natural disasters. See docs/features/experience-update.md for the
 * full design and worked examples behind every column here.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // Tier 0's province_experiences (issue #46) needs the same two flags the
  // new landmark_experiences table below has, so the Seven Wonders showcase
  // can union across both tables — the Great Wall at Badaling (CN-BJ) is
  // already seeded there and is one of the 7.
  await knex.schema.alterTable('province_experiences', (table) => {
    table.boolean('is_new7wonders').notNullable().defaultTo(false);
    table.boolean('is_unesco').notNullable().defaultTo(false);
  });

  // Landmarks/wonders for every country outside Tier 0 (see "Landmarks /
  // wonders" in the feature doc). Scored as a flat % of the country's
  // visit_base + explorer_ceiling — not a population-weighted pool split —
  // so, unlike province_experiences, there's no province-population
  // weighting concern here; province_code is purely for display/grouping.
  await knex.schema.createTable('landmark_experiences', (table) => {
    table.text('id').primary();
    table
      .string('country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    // Tier 1/2 only (real province data) — null for Tier 3 countries, which
    // have no province rows to attach to.
    table
      .string('province_code', 10)
      .references('code')
      .inTable('provinces')
      .onDelete('SET NULL');
    table.string('name', 150).notNullable();
    table.text('description');
    table.boolean('is_new7wonders').notNullable().defaultTo(false);
    table.boolean('is_unesco').notNullable().defaultTo(false);
    table.integer('annual_visitors');
    // Derived from the designation x visitor-count matrix (1/2/3/4/5), not
    // freely chosen — see getLandmarkSignificancePct in points.js.
    table.integer('significance_pct').notNullable();
    table.text('photo_credit');
    table.text('photo_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_landmark_experiences', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .text('experience_id')
      .notNullable()
      .references('id')
      .inTable('landmark_experiences')
      .onDelete('CASCADE');
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'experience_id']);
  });

  // Country-specific transport (issue #74): a route isn't province-scoped
  // and can cross provinces/countries, so it's its own table rather than
  // attached to a province like landmarks are.
  await knex.schema.createTable('transport_experiences', (table) => {
    table.text('id').primary();
    table.string('name', 150).notNullable();
    table
      .string('host_country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    table.text('description');
    table.integer('distance_km');
    table.string('duration', 50);
    // 1.0/1.5/2.0/3.0 band from real distance/duration — see
    // getRouteSignificance in points.js.
    table.decimal('significance_band', 3, 1).notNullable();
    table.text('photo_credit');
    table.text('photo_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_transport_experiences', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .text('experience_id')
      .notNullable()
      .references('id')
      .inTable('transport_experiences')
      .onDelete('CASCADE');
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'experience_id']);
  });

  // Natural disasters (issue #74, v1 = earthquakes only). Not tied to a
  // place row like landmarks/transport — it's a logged event, so it's a
  // direct user+country+band log rather than a "visit a fixed experience"
  // pattern. Anti-abuse: one log per user/country/magnitude-band (unique
  // constraint), same boolean-visited philosophy as province/city visits.
  await knex.schema.createTable('disaster_logs', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .string('country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    table.string('disaster_type', 20).notNullable().defaultTo('earthquake');
    // 1.0/1.5/2.0/2.5/3.0 magnitude band (M4-4.9 .. M8+) — see
    // getMagnitudeComponent in points.js.
    table.decimal('magnitude_band', 3, 1).notNullable();
    table.decimal('points', 8, 2).notNullable();
    table.date('logged_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'country_code', 'disaster_type', 'magnitude_band']);
  });

  // Sourced rarity data per country/disaster type (v1: earthquakes only —
  // real per-country M6+ annual frequency, see the "Sourced rarity data"
  // table in the feature doc). Not a live feed — a one-time seed, re-sourced
  // only if something material changes, same treatment as population/area
  // data. Coverage is intentionally partial (flagged provisional, same
  // pattern as advisory_level) — countries with no row here have no
  // sourced rarity yet, and disaster logging for them should be blocked
  // until they do rather than guessing.
  await knex.schema.createTable('country_disaster_rarity', (table) => {
    table.text('id').primary();
    table
      .string('country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    table.string('disaster_type', 20).notNullable().defaultTo('earthquake');
    table.decimal('avg_events_per_year', 6, 2).notNullable();
    table.decimal('rarity_multiplier', 3, 2).notNullable();
    table.text('source');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['country_code', 'disaster_type']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('country_disaster_rarity');
  await knex.schema.dropTableIfExists('disaster_logs');
  await knex.schema.dropTableIfExists('user_transport_experiences');
  await knex.schema.dropTableIfExists('transport_experiences');
  await knex.schema.dropTableIfExists('user_landmark_experiences');
  await knex.schema.dropTableIfExists('landmark_experiences');
  await knex.schema.alterTable('province_experiences', (table) => {
    table.dropColumn('is_unesco');
    table.dropColumn('is_new7wonders');
  });
};
