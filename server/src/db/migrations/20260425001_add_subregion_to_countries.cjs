/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.string('subregion', 100);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.dropColumn('subregion');
  });
};
