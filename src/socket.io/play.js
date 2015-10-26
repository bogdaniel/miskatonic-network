"use strict";

var Promise = require('bluebird');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');
var played = require('../database/redis/played');

exports.displayTable = function (socket) {
    var game = socket.game;

    storyCard.all(game.id).then(function (cards) {
        socket.emit('activeStoryCards', cards);
    });

    storyDeck.count(game.id).then(function (count) {
        socket.emit('storyDeckCount', count);
    });

    game.players.forEach(function (player) {
        deck.count(game.id, player.id).then(function (count) {
            if (player.id === socket.userId) {
                socket.emit('playerDeckCount', count);

                played.all(game.id, player.id).then(function (cards) {
                    socket.emit('playerPlayedCards', cards);
                });

                //TODO committed

                //TODO resources
            } else {
                socket.emit('opponentDeckCount', count);

                played.all(game.id, player.id).then(function (cards) {
                    socket.emit('opponentPlayedCards', cards);
                });

                //TODO committed

                //TODO resources

                hand.count(game.id, player.id).then(function (count) {
                    socket.emit('opponentHandCount', count);
                });
            }
        });
    });

    hand.all(game.id, socket.userId).then(function (cards) {
        socket.emit('playerHand', cards);
    });
};

exports.playCard = function (socket, cardId) {
    var game = socket.game;

    hand.play(game.id, socket.userId, cardId).then(function (card) {
        socket.broadcast.emit('opponentPlayedCard', card);
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
