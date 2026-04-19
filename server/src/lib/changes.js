// Always call inside a trx so the _changes row commits atomically with the write.
// Returns the new change_id so the caller can echo it back to the client for
// optimistic-write fast-forwarding (Phase 5).

async function record(trx, { table, pk, op, row }) {
  if (!['insert', 'update', 'delete'].includes(op)) {
    throw new Error(`changes.record: invalid op "${op}"`);
  }
  const [inserted] = await trx('_changes')
    .insert({
      table_name: table,
      pk: String(pk),
      op,
      row_json: row === undefined ? null : JSON.stringify(row),
      created_at: new Date().toISOString(),
    })
    .returning('change_id');
  // Knex returns either {change_id: N} or N depending on the dialect/driver.
  return typeof inserted === 'object' ? inserted.change_id : inserted;
}

module.exports = { record };
