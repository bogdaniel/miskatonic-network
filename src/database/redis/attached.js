"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var committed = require('./committed');
var discard = require('./discard');

Promise.promisifyAll(redis);

/**
 * Get all attachment cards in play
 *
 * @param gameId
 * @returns {*}
 */
exports.all = function (gameId) {
    return redis.zrangeAsync('attachedCards:' + gameId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get all attachment cards attached to a single card
 *
 * @param gameId
 * @param attachableId
 * @returns {*}
 */
exports.getAll = function (gameId, attachableId) {
    var self = this;

    return self.all(gameId).then(function (cards) {
        cards.forEach(function (card, index) {
            if (card.attachableId != attachableId) {
                delete cards[index];
            }
        });

        return cards;
    });
};

/**
 * Get a single in play attachment card
 *
 * @param gameId
 * @param cardId
 * @returns {*}
 */
exports.get = function (gameId, cardId) {
    return redis.zrangebyscoreAsync('attachedCards:' + gameId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Count all attachment cards in play
 *
 * @param gameId
 * @returns {*}
 */
exports.count = function (gameId) {
    return redis.zcountAsync('attachedCards:' + gameId, '-inf', '+inf');
};

/**
 * Attach a card to a single card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, card) {
    if (!card.attachableId) {
        throw new Error('Missing attachment card property: attachableId');
    }

    card.position = 'attached';

    return redis.zadd('attachedCards:' + gameId, card.id, JSON.stringify(card));
};

/**
 * Update a single attachment card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.update = function (gameId, card) {
    var self = this;

    return Promise.all([
        self.remove(gameId, card),
        self.add(gameId, card)
    ]);
};

/**
 * Remove a single card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.remove = function (gameId, card) {
    return redis.zremrangebyscore('attachedCards:' + gameId, card.id, card.id);
};

/**
 * Discard a single attachment card from a host card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.discard = function (gameId, card) {
    var self = this;

    return Promise.all([
        discard.add(gameId, card.ownerId, card),
        self.remove(gameId, card)
    ]);
};

/**
 * Discard all attachment card from a host card
 *
 * @param gameId
 * @param attachableId
 * @returns {*}
 */
exports.discardAll = function (gameId, attachableId) {
    var self = this;

    return self.all(gameId).then(function (cards) {
        return Promise.map(cards, function (card) {
            if (card.attachableId == attachableId) {
                return self.discard(gameId, card);
            }
        });
    });
};
