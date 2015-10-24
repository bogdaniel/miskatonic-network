"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

function tableNames(gameId, playerId) {
    return {
        game: 'games',
        currentGame: 'current:' + playerId,
        storyDeck: 'storyDeck:' + gameId,
        storyCards: 'storyCards:' + gameId,
        deck: 'deck:' + gameId + ':' + playerId,
        hand: 'hand:' + gameId + ':' + playerId,
        discardPile: 'discardPile:' + gameId + ':' + playerId,
        playedCards: 'playedCards:' + gameId + ':' + playerId,
        committedCards: 'committedCards:' + gameId + ':' + playerId
    };
}

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

exports.create = function (game, playerId) {
    return Promise.all([
        redis.set('current:' + playerId, JSON.stringify(game)),
        redis.zadd('games', game.id, JSON.stringify(game))
    ]);
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

exports.join = function (game, playerId) {
    redis.set('current:' + playerId, JSON.stringify(game));
};

exports.leave = function (gameId, playerId) {
    redis.del('current:' + playerId);
    redis.del('deck:' + gameId + ':' + playerId);
    redis.del('hand:' + gameId + ':' + playerId);
    redis.del('discardPile:' + gameId + ':' + playerId);
    redis.del('playedCards:' + gameId + ':' + playerId);
    redis.del('committedCards:' + gameId + ':' + playerId);
};
