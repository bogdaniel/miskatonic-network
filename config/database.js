var common = require('../common');
var config = common.config();

var session = require('express-session');
var Knex = require('knex');
var KnexSessionStore = require('connect-session-knex')(session);

var knex = Knex({
    client: 'mysql2',
    connection: {
        host: config.database_host,
        user: config.database_user,
        password: config.database_password,
        database: config.database_name
    }
});

module.exports = new KnexSessionStore({
    knex: knex,
    tablename: 'sessions'
});
