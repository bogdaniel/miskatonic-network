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

exports.add = function (gameId, card) {
    return redis.zadd('storyCards:' + gameId, card.cid, JSON.stringify(card));
};
