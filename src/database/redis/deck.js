"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var hand = require('./hand');

Promise.promisifyAll(redis);

/**
 * Get all cards in a players deck
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.all = function (gameId, playerId) {
    return redis.lrangeAsync('deck:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get a single card from a players deck
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.get = function (gameId, playerId) {
    return redis.rpopAsync('deck:' + gameId + ':' + playerId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Get a players deck count
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.count = function (gameId, playerId) {
    return redis.llenAsync('deck:' + gameId + ':' + playerId);
};

/**
 * Put a single card to the top of a players deck
 *
 * @param gameId
 * @param playerId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, card) {
    return redis.rpushAsync('deck:' + gameId + ':' + playerId, JSON.stringify(card));
};

/**
 * Draw a single card from the top of a players deck and put it into his hand
 *
 * @param gameId
 * @param playerId
 * @returns {*}
 */
exports.drawToHand = function (gameId, playerId) {
    return Promise.try(function () {
        return redis.rpopAsync('deck:' + gameId + ':' + playerId);
    }).then(function (card) {
        return hand.add(gameId, playerId, JSON.parse(card));
    });
};
