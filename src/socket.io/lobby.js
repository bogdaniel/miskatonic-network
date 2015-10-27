"use strict";

var _ = require('underscore');
var moment = require('moment');
var Game = require('../database/redis/game');
var prepare = require('../database/redis/prepare');
var Card = require('../database/mysql/models/card');

exports.current = function (socket) {
    return Game.current(socket.userId).then(function (game) {
        socket.game = game;
    });
};

exports.displayGames = function (socket) {
    return Game.all().then(function (games) {
        socket.emit('gameList', games);
    });
};

exports.create = function (socket, data) {
    if (socket.game) {
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
            resources: [1, 2, 3],
            actions: ['drawCard']
        }],
        host: socket.userId,
        allow_spectators: false,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    socket.game = newGame;

    Game.create(newGame, socket.userId);

    socket.server.of('/lobby').emit('created', {
        game: newGame
    });
};

exports.leave = function (socket) {
    if (!socket.game) {
        return false;
    }

    return Game.get(socket.game.id).then(function (game) {
        game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
        game.status = 'finished';

        Game.leave(game.id, socket.userId);

        if (game.players.length === 0) {
            Game.delete(game);
        } else {
            game.host = game.players[0].id;

            Game.update(game);
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

    return Game.get(data.id).then(function (game) {
        game.players.push({
            id: socket.userId,
            username: socket.username,
            resources: [1, 2, 3],
            actions: ['drawCard']
        });

        socket.game = game;

        Game.update(game);

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
        return prepare.storyCards(game.id, cards);
    }).then(function (storyCards) {
        game.storyCards = _.sortBy(storyCards, 'cid');
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
        game.turn = 0;
        game.activePlayer = 0;
        game.phase = 'setup';
        game.step = null;

        Game.update(game);

        socket.server.of('/lobby').emit('started', {
            game: game
        });
    });
};
