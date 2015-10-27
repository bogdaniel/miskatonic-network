"use strict";

var _ = require('underscore');
var Promise = require('bluebird');
var Game = require('../database/redis/game');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');
var played = require('../database/redis/played');
var committed = require('../database/redis/committed');
var resourced = require('../database/redis/resourced');

exports.displayTable = function (socket) {
    var game = socket.game;

    storyDeck.count(game.id).then(function (count) {
        socket.emit('storyDeckCount', count);
    }).then(function () {
        storyCard.all(game.id).then(function (cards) {
            socket.emit('activeStoryCards', cards);
        });
    }).then(function () {
        game.players.forEach(function (player) {
            deck.count(game.id, player.id).then(function (count) {
                if (player.id === socket.userId) {
                    socket.emit('playerDeckCount', count);
                } else {
                    socket.emit('opponentDeckCount', count);
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    game.storyCards.forEach(function (storyCard) {
                        committed.all(game.id, player.id, storyCard.cid).then(function (cards) {
                            socket.emit('playerCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                } else {
                    game.storyCards.forEach(function (storyCard) {
                        committed.all(game.id, player.id, storyCard.cid).then(function (cards) {
                            socket.emit('opponentCommittedCards', {
                                storyCard: storyCard,
                                cards: cards
                            });
                        });
                    });
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    player.resources.forEach(function (resourceId) {
                        resourced.all(game.id, player.id, resourceId).then(function (cards) {
                            socket.emit('playerResourcedCards', {
                                resourceId: resourceId,
                                cards: cards
                            });
                        });
                    });
                } else {
                    player.resources.forEach(function (resourceId) {
                        resourced.all(game.id, player.id, resourceId).then(function (cards) {
                            socket.emit('opponentResourcedCards', {
                                resourceId: resourceId,
                                cards: cards
                            });
                        });
                    });
                }
            }).then(function () {
                if (player.id !== socket.userId) {
                    hand.count(game.id, player.id).then(function (count) {
                        socket.emit('opponentHandCount', count);
                    });
                }
            }).then(function () {
                if (player.id === socket.userId) {
                    played.all(game.id, player.id).then(function (cards) {
                        socket.emit('playerPlayedCards', cards);
                    });
                } else {
                    played.all(game.id, player.id).then(function (cards) {
                        socket.emit('opponentPlayedCards', cards);
                    });
                }
            });
        });
    }).then(function () {
        hand.all(game.id, socket.userId).then(function (cards) {
            socket.emit('playerHand', cards);
        });
    });
};

exports.drawCard = function (socket) {
    var game = socket.game;
    var data = {};

    return Promise.try(function () {
        return deck.draw(game.id, socket.userId);
    }).then(function (result) {
        socket.emit('playerDrawnCard', result);
        socket.broadcast.emit('opponenetDrawnCard', result.count);

        data.card = result.card;
        data.count = result.count;
    }).then(function () {
        return Game.opponentId(socket.userId);
    }).then(function (opponentId) {
        data.opponentId = opponentId;
    }).then(function () {
        return Promise.all([
            hand.count(game.id, socket.userId),
            hand.count(game.id, data.opponentId)
        ]);
    }).then(function (result) {
        var playerHandCount = result[0];
        var opponentHandCount = result[1];
        var player = _.findWhere(game.players, {id: socket.userId});

        socket.broadcast.emit('opponentHandCount', playerHandCount);

        var actions = game.actions;
        if (actions.phase == 'setup' && !player.setup.drawSetupHand) {
            if (playerHandCount == 8) {
                player.setup.drawSetupHand = true;

                socket.emit('gameActions', {
                    turn: 0,
                    phase: 'setup',
                    step: 'attach-resources',
                    activePlayer: 0
                });
            }
            if (playerHandCount == 8 && opponentHandCount == 8) {
                console.log('OK');
                /*socket.server.of('/play').emit('gameActions', {
                 turn: 1,
                 phase: 'refresh',
                 step: null,
                 activePlayer: game.players[0].id
                 });*/
            }
        }
    });
};

exports.playCard = function (socket, cardId) {
    var game = socket.game;

    hand.play(game.id, socket.userId, cardId).then(function (card) {
        socket.broadcast.emit('opponentPlayedCard', card);
    });
};

exports.commitCard = function (socket, data) {
    var game = socket.game;

    played.commit(game.id, socket.userId, data.storyId, data.cardId).then(function (card) {
        socket.broadcast.emit('opponentCommittedCard', {
            storyId: data.storyId,
            card: card
        });
    });
};

exports.resourceCard = function (socket, data) {
    var game = socket.game;

    hand.resource(game.id, socket.userId, data.resourceId, data.cardId).then(function (card) {
        socket.broadcast.emit('opponentResourcedCard', {
            resourceId: data.resourceId,
            card: card
        });
    });
};
