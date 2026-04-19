/**
 * Phase 0 — bcrypt+JWT auth.
 *
 * One-time destructive rebuild of the `users` table. Replaces the old
 * `(username, email, password_hash NULLABLE, google_id)` shape with the
 * leaner `(identifier, password_hash NOT NULL)` shape. The locking document
 * (docs/db-speed.md) states this is the FINAL destructive users migration —
 * once shipped, everything after must preserve data.
 *
 * Child tables (user_countries, user_cities, user_provinces) reference users.id.
 * SQLite doesn't enforce FKs by default, but we still clear child rows first
 * to avoid leaving orphans once FKs are enforced in Phase 1.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex('user_provinces').del();
  await knex('user_cities').del();
  await knex('user_countries').del();

  await knex.schema.dropTableIfExists('users');
  await knex.schema.createTable('users', (table) => {
    table.text('id').primary();
    table.text('identifier').notNullable();
    table.text('password_hash').notNullable();
    table
      .string('home_country', 2)
      .references('code')
      .inTable('countries')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Case-insensitive uniqueness: "Charlie" and "charlie" are the same identifier.
  await knex.raw('CREATE UNIQUE INDEX users_identifier_ci_unique ON users (LOWER(identifier))');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
  await knex.schema.createTable('users', (table) => {
    table.text('id').primary();
    table.string('username', 50).nullable();
    table.string('email', 255).nullable();
    table.text('password_hash');
    table.text('avatar_url');
    table.string('google_id', 255).unique().nullable();
    table
      .string('home_country', 2)
      .references('code')
      .inTable('countries')
      .onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
