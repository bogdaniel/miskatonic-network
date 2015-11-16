"use strict";

var _ = require('underscore');

exports.gameInfo = function (game, playerId) {
    var opponentId = this.opponent(game, playerId).id;

    return {
        opponentId: opponentId,
        turn: game.turn,
        firstPlayer: game.firstPlayer,
        turnPlayer: game.turnPlayer,
        activePlayer: game.activePlayer,
        phase: game.phase,
        step: game.step,
        actions: this.player(game, playerId).actions,
        storyStruggle: game.temp.storyStruggle
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

exports.domain = function (game, playerId, domainId) {
    var player = this.player(game, playerId);

    return _.findWhere(player.domains, {id: domainId});
};

exports.updateDomain = function (game, domain, playerId) {
    var player = this.player(game, playerId);

    player.domains.forEach(function (d, i) {
        if (d.id == domain.id) {
            player.domains[i] = domain;
        }
    });

    return this.updatePlayer(game, player);
};

exports.resourceMatch = function (resources, card) {
    var match = false;

    resources.forEach(function (resource) {
        if (resource.faction == card.faction) {
            match = true;
        }
    });

    if (card.faction == 'neutral') {
        match = true;
    }

    return match;
};
