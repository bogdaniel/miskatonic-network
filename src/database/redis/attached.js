"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('attachedCards:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.get = function (gameId, playerId, cardId) {
    return redis.zrangebyscoreAsync('attachedCards:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId, playerId) {
    return redis.zcountAsync('attachedCards:' + gameId + ':' + playerId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, card) {
    return redis.zadd('attachedCards:' + gameId + ':' + playerId, card.id, JSON.stringify(card));
};

exports.update = function (gameId, playerId, card) {
    var self = this;

    return Promise.try(function () {
        self.remove(gameId, playerId, card);
    }).then(function () {
        self.add(gameId, playerId, card);
    });
};

exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('attachedCards:' + gameId + ':' + playerId, card.id, card.id);
};
