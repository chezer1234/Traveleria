// User-selectable styles (issue #60): which of the three design directions
// (atlas | orbit | jetstream) the user picked. NULL = never chosen — the
// client keeps its device-local default. Non-destructive: adds a column only.
exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('style', 16).nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('style');
  });
};
