knex.schema.createTable('users', function (table) {
    table.increments('id');
    table.string('user_name');
});
