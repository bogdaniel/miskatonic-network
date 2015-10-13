exports.up = function (knex, Promise) {
    return knex.schema.createTable('users', function (table) {
        table.increments('id').primary();
        table.string('username').notNullable();
        table.string('email').notNullable();
        table.string('password').notNullable();
        table.string('last_login_at');
        table.string('created_at').notNullable();
        table.string('updated_at').notNullable();
        table.string('deleted_at');
    }).then(function () {
        console.log('users table created.');
    });
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('users').then(function () {
        console.log('users table dropped.');
    });
};
