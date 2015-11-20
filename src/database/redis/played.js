"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('playedCards:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.get = function (gameId, playerId, cardId) {
    return redis.zrangebyscoreAsync('playedCards:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

exports.count = function (gameId, playerId) {
    return redis.zcountAsync('playedCards:' + gameId + ':' + playerId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, card) {
    card.position = 'played';

    return redis.zadd('playedCards:' + gameId + ':' + playerId, card.id, JSON.stringify(card));
};

exports.update = function (gameId, playerId, card) {
    var self = this;

    return Promise.all([
        self.remove(gameId, playerId, card),
        self.add(gameId, playerId, card)
    ]);
};

exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('playedCards:' + gameId + ':' + playerId, card.id, card.id);
};

exports.commit = function (gameId, playerId, storyId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        card.status = 'exhausted';

        return Promise.all([
            self.remove(gameId, playerId, card),
            committed.add(gameId, playerId, storyId, card)
        ]);
    });
};
