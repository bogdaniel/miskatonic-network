"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function () {
    return redis.zrevrangeAsync('games', 0, -1).then(function (games) {
        if (!games.length) {
            return false;
        }

        games.forEach(function (game, index) {
            games[index] = JSON.parse(game);
        });

        return games;
    });
};

exports.get = function (gameId) {
    return redis.zrangebyscoreAsync('games', gameId, gameId).then(function (game) {
        if (!game.length) {
            return false;
        }

        return JSON.parse(game);
    });
};

exports.current = function (playerId) {
    return redis.getAsync('current:' + playerId).then(function (game) {
        if (!game) {
            return false;
        }

        return JSON.parse(game);
    });
};

exports.opponentId = function (playerId) {
    return this.current(playerId).then(function (game) {
        var id;

        game.players.forEach(function (player) {
            if (player.id !== playerId) {
                id = player.id;
            }
        });

        return id;
    });
};

exports.create = function (game, playerId) {
    redis.set('current:' + playerId, JSON.stringify(game));
    redis.zadd('games', game.id, JSON.stringify(game));
};

exports.update = function (game) {
    redis.zremrangebyscore('games', game.id, game.id);
    redis.zadd('games', game.id, JSON.stringify(game));

    game.players.forEach(function (player) {
        redis.del('current:' + player.id);
        redis.set('current:' + player.id, JSON.stringify(game));
    });
};

exports.delete = function (game) {
    redis.del('storyDeck:' + game.id);
    redis.del('storyCards:' + game.id);
    redis.zremrangebyscore('games', game.id, game.id);
};

exports.leave = function (gameId, playerId) {
    this.get(gameId).then(function (game) {
        redis.del('current:' + playerId);
        redis.del('deck:' + gameId + ':' + playerId);
        redis.del('hand:' + gameId + ':' + playerId);
        redis.del('discardPile:' + gameId + ':' + playerId);
        redis.del('playedCards:' + gameId + ':' + playerId);

        if (game.storyCards) {
            game.storyCards.forEach(function (storyCard) {
                redis.del('committedCards:' + gameId + ':' + playerId + ':' + storyCard.cid);
            });
        }

        game.players.forEach(function (player) {
            player.resources.forEach(function (resourceId) {
                redis.del('resourcedCards:' + gameId + ':' + playerId + ':' + resourceId);
            });
        });
    });
};
