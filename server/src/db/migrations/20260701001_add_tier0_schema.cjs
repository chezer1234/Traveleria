/**
 * Schema for Tier 0 Nations (issue #46): links cities to provinces, adds a
 * sub-region grouping to provinces, and adds tables for province-level
 * "experiences" (landmarks) that users can log.
 * See docs/features/tier-0-nations.md for the full design.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('cities', (table) => {
    table
      .string('province_code', 10)
      .references('code')
      .inTable('provinces')
      .onDelete('SET NULL');
    table.string('city_type', 20).notNullable().defaultTo('major');
  });

  await knex.schema.alterTable('provinces', (table) => {
    table.string('subregion', 50);
  });

  await knex.schema.createTable('province_experiences', (table) => {
    table.text('id').primary();
    table
      .string('province_code', 10)
      .notNullable()
      .references('code')
      .inTable('provinces')
      .onDelete('CASCADE');
    table.string('name', 150).notNullable();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_province_experiences', (table) => {
    table.text('id').primary();
    table
      .text('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .text('experience_id')
      .notNullable()
      .references('id')
      .inTable('province_experiences')
      .onDelete('CASCADE');
    table.date('visited_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'experience_id']);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_province_experiences');
  await knex.schema.dropTableIfExists('province_experiences');
  await knex.schema.alterTable('provinces', (table) => {
    table.dropColumn('subregion');
  });
  await knex.schema.alterTable('cities', (table) => {
    table.dropColumn('city_type');
    table.dropColumn('province_code');
  });
};
