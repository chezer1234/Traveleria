/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_provinces', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .uuid('user_id')
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
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'province_code']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_provinces');
};
