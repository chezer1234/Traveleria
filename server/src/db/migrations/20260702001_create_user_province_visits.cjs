/**
 * Per-province time logging (issue #46, Phase 2). Mirrors
 * user_country_visits exactly, scoped to a province instead of a country.
 * `user_provinces` stays the canonical "I've been here" marker; a province
 * can be visited with zero logged time.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_province_visits', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .string('province_code', 10)
      .notNullable()
      .references('code')
      .inTable('provinces')
      .onDelete('CASCADE');
    table.integer('days').notNullable();
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'province_code']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_province_visits');
};
