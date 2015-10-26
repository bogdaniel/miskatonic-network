"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId, resourceId) {
    return redis.zrangeAsync('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.add = function (gameId, playerId, resourceId, card) {
    return redis.zadd('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId, (new Date()).getTime(), JSON.stringify(card));
};
