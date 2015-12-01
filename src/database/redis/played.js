"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');

Promise.promisifyAll(redis);

/**
 * Get all played card.
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.all = function (gameId, playerId) {
    return redis.zrangeAsync('playedCards:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get a single played card.
 *
 * @param gameId
 * @param playerId
 * @param cardId
 * @returns {*}
 */
exports.get = function (gameId, playerId, cardId) {
    return redis.zrangebyscoreAsync('playedCards:' + gameId + ':' + playerId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Count players played cards.
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.count = function (gameId, playerId) {
    return redis.zcountAsync('playedCards:' + gameId + ':' + playerId, '-inf', '+inf');
};

/**
 * Add a played card.
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, card) {
    card.position = 'played';

    return redis.zadd('playedCards:' + gameId + ':' + playerId, card.id, JSON.stringify(card));
};

/**
 * Update a single played card.
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.update = function (gameId, playerId, card) {
    var self = this;

    return self.remove(gameId, playerId, card).then(function () {
        return self.add(gameId, playerId, card);
    });
};

/**
 * Remove a single played card.
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.remove = function (gameId, playerId, card) {
    return redis.zremrangebyscore('playedCards:' + gameId + ':' + playerId, card.id, card.id);
};

/**
 * Commit a single played card to committed area.
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param cardId
 * @returns {*}
 */
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
