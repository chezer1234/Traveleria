/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_cities', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .text('city_id')
      .notNullable()
      .references('id')
      .inTable('cities')
      .onDelete('CASCADE');
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'city_id']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_cities');
};
