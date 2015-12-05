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
    return redis.rpushAsync('chat_' + room, JSON.stringify(message)).then(function () {
        return redis.llenAsync('chat_' + room);
    }).then(function (count) {
        if (count > 50) {
            return redis.lpopAsync('chat_' + room);
        }
    });
};
