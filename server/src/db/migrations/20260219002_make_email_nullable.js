/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('email', 255).nullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  // Set null emails to a placeholder before making column NOT NULL
  await knex('users').whereNull('email').update({ email: 'removed@placeholder.local' });
  return knex.schema.alterTable('users', (table) => {
    table.string('email', 255).notNullable().alter();
  });
};
