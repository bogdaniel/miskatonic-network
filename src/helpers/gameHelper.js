"use strict";

var _ = require('underscore');

exports.gameInfo = function (game, playerId) {
    return {
        turn: game.turn,
        activePlayer: game.activePlayer,
        phase: game.phase,
        step: game.step,
        actions: this.player(game, playerId).actions
    };
};

exports.isAllowed = function (player, action) {
    if (_.indexOf(player.actions, action) == -1) {
        return false;
    }

    return true;
};

exports.player = function (game, playerId) {
    return _.findWhere(game.players, {id: playerId});
};

exports.opponent = function (game, playerId) {
    return _.find(game.players, function (player) {
        if (player.id != playerId) {
            return player;
        }
    });
};

exports.updatePlayer = function (game, player) {
    game.players.forEach(function (p, i) {
        if (p.id == player.id) {
            game.players[i] = player;
        }
    });

    return game;
};
