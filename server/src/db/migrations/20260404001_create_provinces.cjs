/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('provinces', (table) => {
    table.text('id').primary();
    table
      .string('country_code', 2)
      .notNullable()
      .references('code')
      .inTable('countries')
      .onDelete('CASCADE');
    table.string('code', 10).notNullable().unique();
    table.string('name', 100).notNullable();
    table.bigInteger('population');
    table.integer('area_km2');
    table.boolean('disputed').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('provinces');
};
