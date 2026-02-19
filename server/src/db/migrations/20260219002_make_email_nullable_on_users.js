/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // Make email nullable so accounts can be created without one
  await knex.schema.alterTable('users', (table) => {
    table.string('email', 255).nullable().alter();
  });
  // Drop the unique constraint (Knex default naming convention)
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('email', 255).notNullable().alter();
  });
  await knex.schema.alterTable('users', (table) => {
    table.unique(['email']);
  });
};
