"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var played = require('./played');
var discard = require('./discard');

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

exports.get = function (gameId, playerId, storyId, cardId) {
    return redis.zrangebyscoreAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId, playerId, storyId) {
    return redis.zcountAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, storyId, card) {
    return redis.zadd('committedCards:' + gameId + ':' + playerId + ':' + storyId, card.id, JSON.stringify(card));
};

exports.update = function (gameId, playerId, storyId, card) {
    var self = this;

    return Promise.try(function () {
        self.remove(gameId, playerId, storyId, card);
    }).then(function () {
        self.add(gameId, playerId, storyId, card);
    });
};

exports.remove = function (gameId, playerId, storyId, card) {
    return Promise.try(function () {
        return discard.add(gameId, card.ownerId, card);
    }).then(function () {
        return redis.zremrangebyscore('committedCards:' + gameId + ':' + playerId + ':' + storyId, card.id, card.id);
    });
};

exports.removeAll = function (gameId, playerId, storyId) {
    var self = this;

    return Promise.try(function () {
        return self.all(gameId, playerId, storyId);
    }).then(function (cards) {
        if (cards) {
            cards.forEach(function (card) {
                self.remove(gameId, playerId, storyId, card);
                played.add(gameId, playerId, card);
            });
        }
    });
};
