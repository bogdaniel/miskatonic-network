"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var played = require('./played');
var resourced = require('./resourced');

Promise.promisifyAll(redis);

/**
 * Get all cards in a players hand
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('hand:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get a single card in a players hand
 *
 * @param gameId
 * @param playerId
 * @param cardId
 * @returns {*}
 */
exports.get = function (gameId, playerId, cardId) {
    return redis.zrangebyscoreAsync('hand:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Count cards in a players hand
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.count = function (gameId, playerId) {
    return redis.zcountAsync('hand:' + gameId + ':' + playerId, '-inf', '+inf');
};

/**
 * Add a card to a players hand
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, card) {
    return redis.zadd('hand:' + gameId + ':' + playerId, card.id, JSON.stringify(card));
};

/**
 * Remove a card from a players hand
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('hand:' + gameId + ':' + playerId, card.id, card.id);
};

/**
 * Play a card from a players hand
 *
 * @param gameId
 * @param playerId
 * @param cardId
 * @returns {*}
 */
exports.play = function (gameId, playerId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        return Promise.all([
            self.remove(gameId, playerId, card),
            played.add(gameId, playerId, card)
        ]);
    });
};

/**
 * Resource a card from a players hand
 *
 * @param gameId
 * @param playerId
 * @param domainId
 * @param cardId
 * @returns {*}
 */
exports.resource = function (gameId, playerId, domainId, cardId) {
    var self = this;

    return self.get(gameId, playerId, cardId).then(function (card) {
        card.status = 'resource';

        return Promise.all([
            self.remove(gameId, playerId, card),
            resourced.add(gameId, playerId, domainId, card)
        ]);
    });
};
