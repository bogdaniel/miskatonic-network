"use strict";

var _ = require('underscore');
var moment = require('moment');
var redis = require('../database/redis/lobby');

exports.create = function (socket, data) {
    if (socket.game) {
        return;
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
        return;
    }

    redis.get(socket.game.id).then(function (game) {
        game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));

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

exports.join = function(socket, data) {
    if (socket.game) {
        return;
    }

    redis.get(data.id).then(function (game) {
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
