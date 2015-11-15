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
    return redis.smembersAsync('discard:' + gameId + ':' + playerId).then(function (cards) {
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
    return redis.scardAsync('discard:' + gameId + ':' + playerId);
};

/**
 * Add a card to a players discard pile
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, card) {
    card.status = 'active';

    return redis.sadd('discard:' + gameId + ':' + playerId, JSON.stringify(card));
};
