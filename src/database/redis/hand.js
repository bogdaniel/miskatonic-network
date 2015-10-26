"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var played = require('./played');
var resourced = require('./resourced');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('hand:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
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
    return redis.zrangebyscoreAsync('hand:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId, playerId) {
    return redis.zcountAsync('hand:' + gameId + ':' + playerId, '-inf', '+inf');
};

exports.add = function (gameId, playerId, card) {
    return redis.zadd('hand:' + gameId + ':' + playerId, card.cid, JSON.stringify(card));
};

exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('hand:' + gameId + ':' + playerId, card.cid, card.cid);
};

exports.play = function (gameId, playerId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        self.remove(gameId, playerId, card);
        played.add(gameId, playerId, card);

        return card;
    });
};

exports.resource = function (gameId, playerId, resourceId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        card.status = 'resource';

        self.remove(gameId, playerId, card);
        resourced.add(gameId, playerId, resourceId, card);

        return card;
    });
};
