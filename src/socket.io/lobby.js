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
            domains: [{id: 1, status: 'active'}, {id: 2, status: 'active'}, {id: 3, status: 'active'}],
            actions: ['drawCard'],
            successTokens: {}
        }],
        host: socket.userId,
        temp: {
            drawnCards: 0,
            storyCommits: [],
            storyStruggle: 0,
            insaneRestored: 0
        },
        allow_spectators: false,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    socket.gameId = newGame.id;

    return Game.create(newGame, socket.userId).then(function () {
        socket.server.of('/lobby').emit('created', {
            game: newGame
        });
    });
};

exports.leave = function (socket) {
    if (!socket.gameId) {
        return false;
    }

    return Game.get(socket.gameId).then(function (game) {
        delete socket.gameId;

        game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
        game.status = 'finished';

        return Game.leave(game.id, socket.userId).then(function () {
            if (game.players.length === 0) {
                return Game.delete(game);
            } else {
                game.host = game.players[0].id;

                return Game.update(game);
            }
        }).then(function () {
            socket.server.of('/lobby').emit('left', {
                game: game
            });
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
            domains: [{id: 1, status: 'active'}, {id: 2, status: 'active'}, {id: 3, status: 'active'}],
            actions: ['drawCard'],
            successTokens: {}
        });

        game.firstPlayer = game.players[0].id;

        socket.gameId = game.id;

        return Game.update(game).then(function () {
            socket.server.of('/lobby').emit('joined', {
                game: game
            });
        });
    });
};

exports.start = function (socket) {
    if (!socket.gameId) {
        return false;
    }

    return Promise.try(function () {
        return Game.current(socket.userId);
    }).then(function (result) {
        var game = result;

        if (game.players.length !== 2) {
            return false;
        }

        return Promise.props({
            storyCards: Card.where('type', '=', 'Story').where('set_id', '=', 1).fetchAll().then(cards => cards.toJSON()),
            playerDeck: Card.where('set_id', '=', 1).where(function () {
                this.where('faction', '=', 'Shub-Niggurath').orWhere('faction', '=', 'Yog-Sothoth');
            }).query('orWhere', 'id', '>=', 141).where('id', '<=', 147).fetchAll().then(cards => cards.toJSON()),
            opponentDeck: Card.where('set_id', '=', 1).where(function () {
                this.where('faction', '=', 'The Agency').orWhere('faction', '=', 'Miskatonic University');
            }).query('orWhere', 'id', '>=', 148).where('id', '<=', 153).query('orWhere', 'id', '=', 158).fetchAll().then(cards => cards.toJSON())
        }).then(function (result) {
            game.storyCards = prepare.storyCards(game, result.storyCards);
            prepare.playerDeck(game.id, game.players[0].id, result.playerDeck);
            prepare.playerDeck(game.id, game.players[1].id, result.opponentDeck);
        }).then(function () {
            game.status = 'in-game';
            game.turn = 0;
            game.turnPlayer = 0;
            game.activePlayer = 0;
            game.phase = 'setup';
            game.step = null;

            return Game.update(game).then(function () {
                socket.server.of('/lobby').emit('started', {
                    game: game
                });
            });
        });
    });
};
