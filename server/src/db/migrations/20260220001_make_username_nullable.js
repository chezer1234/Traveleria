/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('username', 50).nullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  // Set null usernames to a placeholder before making column NOT NULL
  await knex('users').whereNull('username').update({ username: knex.raw("'user_' || left(id::text, 8)") });
  return knex.schema.alterTable('users', (table) => {
    table.string('username', 50).notNullable().alter();
  });
};
