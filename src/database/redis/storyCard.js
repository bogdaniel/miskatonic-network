"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId) {
    return redis.smembersAsync('storyCards:' + gameId).then(function (cards) {
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
    return redis.sadd('storyCards:' + gameId, JSON.stringify(card));
};
