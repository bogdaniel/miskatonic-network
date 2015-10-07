var common = require('./common');
var config = common.config();

module.exports = {
    client: 'mysql2',
    connection: {
        host: config.database_host,
        user: config.database_user,
        password: config.database_password,
        database: config.database_name
    },
    migrations: {
        directory: __dirname + '/storage/migrations',
        tableName: 'migrations'
    }
};
