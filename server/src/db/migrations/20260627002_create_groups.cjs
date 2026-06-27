/**
 * Groups feature (issue #37). Two tables:
 *   groups        — named persistent group, owned by a creator.
 *   group_members — many-to-many join with per-member colour prefs.
 *
 * Colour conflict resolution (primary → secondary → auto fallback) is
 * client-side; the server stores the raw picks the user made.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('groups', (table) => {
      table.text('id').primary();
      table.text('name').notNullable();
      table
        .text('created_by')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    .createTable('group_members', (table) => {
      table.text('id').primary();
      table
        .text('group_id')
        .notNullable()
        .references('id')
        .inTable('groups')
        .onDelete('CASCADE');
      table
        .text('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.text('primary_colour').notNullable();
      table.text('secondary_colour').notNullable();
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['group_id', 'user_id']);
    });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('group_members')
    .dropTableIfExists('groups');
};
