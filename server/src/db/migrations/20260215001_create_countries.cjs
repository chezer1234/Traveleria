/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('countries', (table) => {
    table.string('code', 2).primary();
    table.string('name', 100).notNullable();
    table.string('region', 50).notNullable();
    table.bigInteger('population').notNullable();
    table.bigInteger('annual_tourists').notNullable();
    table.integer('area_km2').notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('countries');
};
