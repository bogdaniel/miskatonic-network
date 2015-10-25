"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.smembersAsync('hand:' + gameId + ':' + playerId).then(function (cards) {
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
    return redis.scardAsync('hand:' + gameId + ':' + playerId).then(function (count) {
        return count;
    });
};

exports.play = function (gameId, playerId, cardId) {
    //
};
