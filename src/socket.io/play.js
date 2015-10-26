"use strict";

var Promise = require('bluebird');
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

    deck.draw(game.id, socket.userId).then(function (data) {
        socket.emit('playerDrawnCard', data);
        socket.broadcast.emit('opponenetDrawnCard', data.count);
    }).then(function () {
        return hand.count(game.id, socket.userId);
    }).then(function (count) {
        socket.broadcast.emit('opponentHandCount', count);
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
