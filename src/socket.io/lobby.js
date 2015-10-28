"use strict";

var _ = require('underscore');
var moment = require('moment');
var Promise = require('bluebird');
var Game = require('../database/redis/game');
var prepare = require('../database/redis/prepare');
var Card = require('../database/mysql/models/card');

exports.current = function (socket) {
    return Game.current(socket.userId).then(function (game) {
        socket.gameId = game.id;
    });
};

exports.displayGames = function (socket) {
    return Game.all().then(function (games) {
        socket.emit('gameList', games);
    });
};

exports.create = function (socket, data) {
    if (socket.gameId) {
        return false;
    }

    var newGame = {
        id: (new Date()).getTime(),
        title: data.title,
        status: 'lobby',
        is_started: false,
        players: [{
            id: socket.userId,
            username: socket.username,
            resources: [{id: 1, status: 'active'}, {id: 2, status: 'active'}, {id: 3, status: 'active'}],
            actions: ['drawCard']
        }],
        host: socket.userId,
        temp: {
            drawnCards: 0
        },
        allow_spectators: false,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    socket.gameId = newGame.id;
    Game.create(newGame, socket.userId);

    socket.server.of('/lobby').emit('created', {
        game: newGame
    });
};

exports.leave = function (socket) {
    if (!socket.gameId) {
        return false;
    }

    return Game.get(socket.gameId).then(function (game) {
        game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
        game.status = 'finished';

        Game.leave(game.id, socket.userId);

        if (game.players.length === 0) {
            Game.delete(game);
        } else {
            game.host = game.players[0].id;

            Game.update(game);
        }

        delete socket.gameId;

        socket.server.of('/lobby').emit('left', {
            game: game
        });
    });
};

exports.join = function (socket, data) {
    if (socket.gameId) {
        return false;
    }

    return Game.get(data.id).then(function (game) {
        game.players.push({
            id: socket.userId,
            username: socket.username,
            resources: [{id: 1, status: 'active'}, {id: 2, status: 'active'}, {id: 3, status: 'active'}],
            actions: ['drawCard']
        });

        socket.gameId = game.id;
        Game.update(game);

        socket.server.of('/lobby').emit('joined', {
            game: game
        });
    });
};

exports.start = function (socket) {
    if (!socket.gameId) {
        return false;
    }

    var game;

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        game = result;

        if (game.players.length !== 2) {
            return false;
        }

        return Promise.props({
            storyCards: Card.where('type', '=', 'Story').where('set_id', '=', 1).query(function (qb) {
                qb.orderByRaw('RAND()');
            }).fetchAll().then(cards => cards.toJSON()),
            playerDeck: Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
                qb.orderByRaw('RAND()').limit(50);
            }).fetchAll().then(cards => cards.toJSON()),
            opponentDeck: Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
                qb.orderByRaw('RAND()').limit(50);
            }).fetchAll().then(cards => cards.toJSON())
        }).then(function (result) {
            game.storyCards = prepare.storyCards(game.id, result.storyCards);
            prepare.playerDeck(game.id, game.players[0].id, result.playerDeck);
            prepare.playerDeck(game.id, game.players[1].id, result.opponentDeck);
        }).then(function () {
            game.status = 'in-game';
            game.turn = 0;
            game.activePlayer = 0;
            game.phase = 'setup';
            game.step = null;

            Game.update(game);

            socket.server.of('/lobby').emit('started', {
                game: game
            });
        });
    });
};
