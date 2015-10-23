"use strict";

var env = require('./env.json');

exports.all = function () {
    var node_env = process.env.NODE_ENV || 'dev';
    return env[node_env];
};
