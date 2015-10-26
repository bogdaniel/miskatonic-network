"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('playedCards:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.count = function (gameId, playerId) {
    return redis.zcountAsync('playedCards:' + gameId + ':' + playerId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, card) {
    return redis.zadd('playedCards:' + gameId + ':' + playerId, card.cid, JSON.stringify(card));
};
