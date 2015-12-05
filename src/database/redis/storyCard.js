"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

/**
 * Get all played story cards
 *
 * @param gameId
 * @returns {*}
 */
exports.all = function (gameId) {
    return redis.zrangeAsync('storyCards:' + gameId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get a single story card
 *
 * @param gameId
 * @param cardId
 * @returns {*}
 */
exports.get = function (gameId, cardId) {
    return redis.zrangebyscoreAsync('storyCards:' + gameId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Add a story card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, card) {
    return redis.zaddAsync('storyCards:' + gameId, card.id, JSON.stringify(card));
};

/**
 * Update a story card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.update = function (gameId, card) {
    var self = this;

    return self.remove(gameId, card).then(function () {
        return self.add(gameId, card);
    });
};

/**
 * Remove a story card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.remove = function (gameId, card) {
    return redis.zremrangebyscoreAsync('storyCards:' + gameId, card.id, card.id);
};
