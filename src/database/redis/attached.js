"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');

Promise.promisifyAll(redis);

exports.all = function (gameId) {
    return redis.zrangeAsync('attachedCards:' + gameId, 0, -1).then(function (cards) {
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
    return redis.zrangebyscoreAsync('attachedCards:' + gameId, cardId, cardId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId) {
    return redis.zcountAsync('attachedCards:' + gameId, '-inf', '+inf');
};

exports.add = function (gameId, card) {
    return redis.zadd('attachedCards:' + gameId, card.id, JSON.stringify(card));
};

exports.update = function (gameId, card) {
    var self = this;

    return Promise.try(function () {
        self.remove(gameId, card);
    }).then(function () {
        self.add(gameId, card);
    });
};

exports.remove = function (gameId, card) {
    return redis.zremrangebyscore('attachedCards:' + gameId, card.id, card.id);
};
