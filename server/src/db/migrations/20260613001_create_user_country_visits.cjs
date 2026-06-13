/**
 * Territory score (issue #29). Per-user time logged in a country. One row per
 * logged stay: `days` is required, `visited_at` is optional (the user may know
 * they spent a week somewhere but not remember when). Total time in a country =
 * SUM(days) for that (user, country). Sits alongside `user_countries` — that
 * stays the canonical "I've been here" marker; a country can be visited with
 * zero logged time.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_country_visits', (table) => {
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
    table.integer('days').notNullable();
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['user_id', 'country_code']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_country_visits');
};
