"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var hand = require('./hand');

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

exports.getAndRemoveRandom = function (gameId, playerId) {
    return redis.spopAsync('deck:' + gameId + ':' + playerId).then(function (card) {
        if (!card.length) {
            return false;
        }

        return JSON.parse(card);
    });
};

exports.count = function (gameId, playerId) {
    return redis.scardAsync('deck:' + gameId + ':' + playerId);
};

exports.add = function (gameId, playerId, card) {
    return redis.sadd('deck:' + gameId + ':' + playerId, JSON.stringify(card));
};

/**
 * Draw a card from players deck.
 * Returns the drawn card and the number of cards in players deck.
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.draw = function (gameId, playerId) {
    var self = this;
    var data = {};

    return Promise.try(function () {
        return self.getAndRemoveRandom(gameId, playerId);
    }).then(function (card) {
        hand.add(gameId, playerId, card);

        data.card = card;
    }).then(function () {
        return self.count(gameId, playerId);
    }).then(function (count) {
        data.count = count;

        return data;
    });
};
