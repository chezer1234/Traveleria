/**
 * Add latitude and longitude columns to countries table
 * for distance-based points calculation.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.float('lat').nullable();
    table.float('lng').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('countries', (table) => {
    table.dropColumn('lat');
    table.dropColumn('lng');
  });
};
