"use strict";

var _ = require('underscore');
var redis = require('../redis');
var Promise = require('bluebird');
var Game = require('./game');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId, resourceId) {
    return redis.zrangeAsync('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId, 0, -1).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.count = function (gameId, playerId, resourceId) {
    return redis.zcountAsync('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId, '-inf', '+inf');
};

exports.countEach = function (gameId, playerId) {
    var self = this;

    return Promise.try(function () {
        return Game.current(playerId);
    }).then(function (game) {
        var player = _.findWhere(game.players, {id: playerId});

        return player.resources;
    }).map(function (resourceId) {
        return self.count(gameId, playerId, resourceId);
    });
};

exports.countAll = function (gameId, playerId) {
    var self = this;

    return Promise.try(function () {
        return Game.current(playerId);
    }).then(function (game) {
        var player = _.findWhere(game.players, {id: playerId});

        return player.resources;
    }).map(function (resourceId) {
        return self.count(gameId, playerId, resourceId);
    }).then(function (result) {
        var count = 0;

        result.forEach(function (c) {
            count += c;
        });

        return count;
    });
};

exports.add = function (gameId, playerId, resourceId, card) {
    return redis.zadd('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId, (new Date()).getTime(), JSON.stringify(card));
};
