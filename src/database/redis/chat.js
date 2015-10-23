"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (room) {
    return redis.lrangeAsync('chat_' + room, 0, -1).then(function (messages) {
        if (!messages.length) {
            return false;
        }

        messages.forEach(function (message, index) {
            messages[index] = JSON.parse(message);
        });

        return messages;
    });
};

exports.save = function (room, message) {
    redis.rpush('chat_' + room, JSON.stringify(message));
    redis.llen('chat_' + room, function (error, reply) {
        if (reply > 50) {
            redis.lpop('chat_' + room);
        }
    });
};
