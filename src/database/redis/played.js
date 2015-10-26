"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');

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

exports.get = function (gameId, playerId, cardId) {
    return redis.zrangebyscoreAsync('playedCards:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId, playerId) {
    return redis.zcountAsync('playedCards:' + gameId + ':' + playerId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, card) {
    return redis.zadd('playedCards:' + gameId + ':' + playerId, card.cid, JSON.stringify(card));
};

exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('playedCards:' + gameId + ':' + playerId, card.cid, card.cid);
};

exports.commit = function (gameId, playerId, storyId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        card.status = 'exhausted';

        self.remove(gameId, playerId, card);
        committed.add(gameId, playerId, storyId, card);

        return card;
    });
};
