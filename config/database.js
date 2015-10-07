var common = require('../common');
var config = common.config();

var knex = require('knex')({
    client: 'mysql2',
    connection: {
        host: config.database_host,
        user: config.database_user,
        password: config.database_password,
        database: config.database_name
    }
});

module.exports = knex;
