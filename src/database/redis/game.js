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
    }
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

exports.create = function (game, playerId) {
    return Promise.all([
        redis.set('current:' + playerId, JSON.stringify(game)),
        redis.zadd('games', game.id, JSON.stringify(game))
    ]);
};

exports.update = function (game) {
    this.delete(game);
    this.create(game);
};

exports.delete = function (game) {
    redis.del('storyDeck:' + game.id);
    redis.del('storyCards:' + game.id);

    game.players.forEach(function (player) {
        redis.del('current:' + player.id);
        redis.del('deck:' + game.id + ':' + player.id);
        redis.del('hand:' + game.id + ':' + player.id);
        redis.del('discardPile:' + game.id + ':' + player.id);
        redis.del('playedCards:' + game.id + ':' + player.id);
        redis.del('committedCards:' + game.id + ':' + player.id);
    });

    redis.zremrangebyscore('games', game.id, game.id);
};

exports.join = function (gameId, playerId) {
    //
};

exports.leave = function (gameId, playerId) {
    var self = this;

    self.get(gameId).then(function (game) {
        game.players = _.without(game.players, _.findWhere(game.players, {id: playerId}));

        if (game.players.length === 0) {
            self.delete(game);
        } else {
            self.update(game);
        }
    });
};
