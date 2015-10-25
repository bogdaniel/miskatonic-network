"use strict";

var _ = require('underscore');
var moment = require('moment');
var redis = require('../database/redis/lobby');
var prepare = require('../database/redis/prepare');
var Card = require('../database/mysql/models/card');

exports.current = function (socket) {
    return redis.current(socket.userId).then(function (game) {
        socket.game = game;
    });
};

exports.displayGames = function (socket) {
    return redis.all().then(function (games) {
        socket.emit('gameList', games);
    });
};

exports.create = function (socket, data) {
    if (socket.game) {
        return false;
    }

    var game = {
        id: (new Date()).getTime(),
        title: data.title,
        status: 'lobby',
        is_started: false,
        players: [{id: socket.userId, username: socket.username}],
        allow_spectators: false,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    socket.game = game;

    redis.create(game, socket.userId);

    socket.server.of('/lobby').emit('created', {
        game: game
    });
};

exports.leave = function (socket) {
    if (!socket.game) {
        return false;
    }

    return redis.get(socket.game.id).then(function (game) {
        game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
        game.status = 'finished';

        redis.leave(game.id, socket.userId);

        if (game.players.length === 0) {
            redis.delete(game);
        } else {
            redis.update(game);
        }

        delete socket.game;

        socket.server.of('/lobby').emit('left', {
            game: game
        });
    });
};

exports.join = function (socket, data) {
    if (socket.game) {
        return false;
    }

    return redis.get(data.id).then(function (game) {
        game.players.push({
            id: socket.userId,
            username: socket.username
        });

        socket.game = game;

        redis.update(game);

        socket.server.of('/lobby').emit('joined', {
            game: game
        });
    });
};

exports.start = function (socket) {
    if (!socket.game || socket.game.players.length !== 2) {
        return false;
    }

    var game = socket.game;

    return Card.where('type', '=', 'Story').where('set_id', '=', 1).query(function (qb) {
        qb.orderByRaw('RAND()');
    }).fetchAll().then(cards => cards.toJSON()).then(function (cards) {
        prepare.storyCards(game.id, cards);
    }).then(function () {
        return Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll().then(cards => cards.toJSON());
    }).then(function (cards) {
        prepare.playerDeck(game.id, game.players[0].id, cards);
    }).then(function () {
        return Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll().then(cards => cards.toJSON());
    }).then(function (cards) {
        prepare.playerDeck(game.id, game.players[1].id, cards);
    }).then(function () {
        game.status = 'in-game';

        redis.update(game);

        socket.server.of('/lobby').emit('started', {
            game: game
        });
    });
};
