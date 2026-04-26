exports.up = function (knex) {
  return knex.schema.createTable('user_subregions', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('subregion', 100).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['user_id', 'subregion']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('user_subregions');
};
