"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

/**
 * Get all card in a players discard pile
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.all = function (gameId, playerId) {
    return redis.lrangeAsync('discard:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Count all cards in a players discard pile
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.count = function (gameId, playerId) {
    return redis.llenAsync('discard:' + gameId + ':' + playerId);
};

/**
 * Put a card to the top of a players discard pile
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, card) {
    card.position = 'discard';
    card.status = 'active';

    return redis.rpushAsync('discard:' + gameId + ':' + playerId, JSON.stringify(card));
};
