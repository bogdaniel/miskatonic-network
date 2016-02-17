var config = require('../../config').all();
var redis = require('redis');

module.exports = redis.createClient(config.redis_port, config.redis_host);
