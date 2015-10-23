var config = require('./config').all();

module.exports = {
    client: 'mysql2',
    connection: {
        host: config.mysql_host,
        user: config.mysql_user,
        password: config.mysql_password,
        database: config.mysql_name
    },
    migrations: {
        directory: __dirname + '/storage/migrations',
        tableName: 'migrations'
    },
    seeds: {
        directory: __dirname + '/storage/seeds'
    }
};
