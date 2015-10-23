var config = require('../../../config').all();

var knex = require('knex')({
    client: 'mysql2',
    connection: {
        host: config.mysql_host,
        user: config.mysql_user,
        password: config.mysql_password,
        database: config.mysql_name
    }
});

module.exports = knex;
