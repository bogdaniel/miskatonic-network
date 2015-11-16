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
    return redis.lrangeAsync('hand:' + gameId + ':' + playerId, 0, -1).then(function (cards) {
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
    return this.all(gameId, playerId).then(function (cards) {
        var card = null;

        cards.forEach(function (_card) {
            if (_card.id == cardId) {
                card = _card;
            }
        });

        if (card === null) {
            throw new Error('No result');
        }

        return card;
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
    return redis.llenAsync('hand:' + gameId + ':' + playerId);
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
    return redis.rpushAsync('hand:' + gameId + ':' + playerId, JSON.stringify(card));
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
    return this.all(gameId, playerId).then(function (cards) {
        return Promise.map(cards, function (_card) {
            if (_card.id == card.id) {
                return redis.lremAsync('hand:' + gameId + ':' + playerId, 0, JSON.stringify(_card));
            }
        });
    });
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
