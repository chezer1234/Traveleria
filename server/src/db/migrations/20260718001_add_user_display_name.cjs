// Settings tab (issue #69): a user-facing display name shown on the
// leaderboard and battles instead of the sign-in identifier. NULL = fall back
// to the identifier. Non-destructive: adds a column only.
exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('display_name', 40).nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('display_name');
  });
};
