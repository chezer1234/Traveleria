/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('username', 50).unique().notNullable();
    table.string('email', 255).unique().notNullable();
    table.text('password_hash');
    table.text('avatar_url');
    table
      .string('home_country', 2)
      .references('code')
      .inTable('countries')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
