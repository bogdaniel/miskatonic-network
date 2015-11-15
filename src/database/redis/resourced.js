"use strict";

var _ = require('underscore');
var redis = require('../redis');
var Promise = require('bluebird');
var Game = require('./game');

Promise.promisifyAll(redis);

exports.all = function (gameId, playerId, domainId) {
    return redis.zrangeAsync('resourcedCards:' + gameId + ':' + playerId + ':' + domainId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.count = function (gameId, playerId, domainId) {
    return redis.zcountAsync('resourcedCards:' + gameId + ':' + playerId + ':' + domainId, '-inf', '+inf');
};

exports.countEach = function (gameId, playerId) {
    var self = this;

    return Promise.try(function () {
        return Game.current(playerId);
    }).then(function (game) {
        var player = _.findWhere(game.players, {id: playerId});

        return player.domains;
    }).map(function (domain) {
        return self.count(gameId, playerId, domain.id);
    });
};

exports.countAll = function (gameId, playerId) {
    var self = this;

    return Promise.try(function () {
        return Game.current(playerId);
    }).then(function (game) {
        var player = _.findWhere(game.players, {id: playerId});

        return player.domains;
    }).map(function (domain) {
        return self.count(gameId, playerId, domain.id);
    }).then(function (result) {
        var count = 0;

        result.forEach(function (c) {
            count += c;
        });

        return count;
    });
};

exports.add = function (gameId, playerId, domainId, card) {
    return redis.zadd('resourcedCards:' + gameId + ':' + playerId + ':' + domainId, (new Date()).getTime(), JSON.stringify(card));
};
