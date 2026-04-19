/**
 * Phase 1 — server change feed.
 *
 * Every mutation to user-owned data appends a row here inside the same
 * transaction as the write itself. Clients poll GET /api/changes?since=N to
 * sync incrementally; a missing row ⇒ missing side effect ⇒ bug.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('_changes', (table) => {
    table.increments('change_id').primary();
    table.text('table_name').notNullable();
    table.text('pk').notNullable();
    table.text('op').notNullable();
    table.text('row_json');
    table.text('created_at').notNullable();
  });
  await knex.raw(
    "CREATE INDEX changes_table_pk_idx ON _changes (table_name, pk)"
  );
  // Enforce allowed ops at the DB layer — cheap belt-and-braces.
  await knex.raw(
    "CREATE TRIGGER changes_op_check BEFORE INSERT ON _changes " +
    "FOR EACH ROW WHEN NEW.op NOT IN ('insert','update','delete') " +
    "BEGIN SELECT RAISE(ABORT, 'invalid op'); END"
  );
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP TRIGGER IF EXISTS changes_op_check');
  await knex.schema.dropTableIfExists('_changes');
};
