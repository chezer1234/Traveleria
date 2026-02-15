/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('cities', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table
      .string('country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.bigInteger('population').notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('cities');
};
