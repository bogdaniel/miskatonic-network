"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.smembersAsync('deck:' + gameId + ':' + playerId).then(function (cards) {
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
    return redis.scardAsync('deck:' + gameId + ':' + playerId).then(function (count) {
        return count;
    });
};

exports.draw = function (gameId, playerId) {
    var self = this;
    var data = {};

    return redis.spopAsync('deck:' + gameId + ':' + playerId).then(function (card) {
        redis.sadd('hand:' + gameId + ':' + playerId, card);

        data.card = JSON.parse(card);
    }).then(function () {
        return self.count(gameId, playerId);
    }).then(function (count) {
        data.count = count;

        return data;
    });
};
