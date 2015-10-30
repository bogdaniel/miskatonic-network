"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId) {
    return redis.zrangeAsync('storyCards:' + gameId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.get = function (gameId, cardId) {
    return redis.zrangebyscoreAsync('storyCards:' + gameId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.add = function (gameId, card) {
    return redis.zadd('storyCards:' + gameId, card.id, JSON.stringify(card));
};
