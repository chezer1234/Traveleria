/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.integer('advisory_level').notNullable().defaultTo(1);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.dropColumn('advisory_level');
  });
};
