"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var played = require('./played');
var committed = require('./committed');

Promise.promisifyAll(redis);

/**
 * Update a single card
 *
 * @param gameId
 * @param card
 * @returns {*}
 */
exports.update = function (gameId, card) {
    if (card.position == 'played') {
        return played.update(gameId, card.ownerId, card);
    } else if (card.position == 'committed') {
        return committed.update(gameId, card.ownerId, card.committedStory, card);
    } else {
        throw new Error('Unknown card position');
    }
};
