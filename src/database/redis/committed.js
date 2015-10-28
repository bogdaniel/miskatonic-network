"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId, storyId) {
    return redis.zrangeAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.add = function (gameId, playerId, storyId, card) {
    return redis.zadd('committedCards:' + gameId + ':' + playerId + ':' + storyId, card.id, JSON.stringify(card));
};
