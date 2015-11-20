"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var played = require('./played');
var discard = require('./discard');
var attached = require('./attached');

Promise.promisifyAll(redis);

/**
 * Get a players all card committed cards to a single story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @returns {*}
 */
exports.all = function (gameId, playerId, storyId) {
    return redis.zrangeAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

/**
 * Get a players single committed card to a single story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param cardId
 * @returns {*}
 */
exports.get = function (gameId, playerId, storyId, cardId) {
    return redis.zrangebyscoreAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, cardId, cardId).then(function (card) {
        if (card.length != 1) {
            throw new Error('No result');
        }

        return JSON.parse(card[0]);
    });
};

/**
 * Count a players committed cards to a single story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @returns {*}
 */
exports.count = function (gameId, playerId, storyId) {
    return redis.zcountAsync('committedCards:' + gameId + ':' + playerId + ':' + storyId, '-inf', '+inf');
};

/**
 * Commit a players single card to a story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param card
 * @returns {*}
 */
exports.add = function (gameId, playerId, storyId, card) {
    card.position = 'committed';
    card.committedStory = storyId;

    return redis.zadd('committedCards:' + gameId + ':' + playerId + ':' + storyId, card.id, JSON.stringify(card));
};

/**
 * Update a committed card
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param card
 * @returns {*}
 */
exports.update = function (gameId, playerId, storyId, card) {
    var self = this;

    return Promise.all([
        self.remove(gameId, playerId, storyId, card),
        self.add(gameId, playerId, storyId, card)
    ]);
};

/**
 * Uncommit a players single card from a story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param card
 * @returns {*}
 */
exports.uncommit = function (gameId, playerId, storyId, card) {
    var self = this;

    return Promise.all([
        self.remove(gameId, playerId, storyId, card),
        played.add(gameId, playerId, card)
    ]);
};

/**
 * Uncommit a players all card from a story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @returns {*}
 */
exports.uncommitAll = function (gameId, playerId, storyId) {
    var self = this;

    return self.all(gameId, playerId, storyId).then(function (cards) {
        return Promise.map(cards, function (card) {
            return self.uncommit(gameId, playerId, storyId, card);
        });
    });
};

/**
 * Remove a players single card from a story
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param card
 * @returns {*}
 */
exports.remove = function (gameId, playerId, storyId, card) {
    card.committedStory = null;

    return redis.zremrangebyscore('committedCards:' + gameId + ':' + playerId + ':' + storyId, card.id, card.id);
};

/**
 * Go insane a single card from committed cards
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param cardId
 * @returns {*}
 */
exports.goInsane = function (gameId, playerId, storyId, cardId) {
    var self = this;

    return self.get(gameId, playerId, storyId, cardId).then(function (card) {
        card.status = 'insane';

        return Promise.all([
            attached.discardAll(gameId, card.id),
            self.remove(gameId, playerId, storyId, card),
            played.add(gameId, playerId, card)
        ]);
    });
};

/**
 * Discard a single card from committed cards
 *
 * @param gameId
 * @param playerId
 * @param storyId
 * @param cardId
 * @returns {*}
 */
exports.discard = function (gameId, playerId, storyId, cardId) {
    var self = this;

    return self.get(gameId, playerId, storyId, cardId).then(function (card) {
        return Promise.all([
            attached.discardAll(gameId, card.id),
            self.remove(gameId, playerId, storyId, card),
            discard.add(gameId, playerId, card)
        ]);
    });
};
