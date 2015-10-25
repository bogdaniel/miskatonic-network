"use strict";

var Promise = require('bluebird');
var storyCard = require('../database/redis/storyCard');
var storyDeck = require('../database/redis/storyDeck');
var deck = require('../database/redis/deck');
var hand = require('../database/redis/hand');

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
            } else {
                socket.emit('opponentDeckCount', count);
                hand.count(game.id, player.id).then(function (count) {
                    socket.emit('opponentHandCount', count);
                });
            }
        });
    });

    hand.all(game.id, socket.userId).then(function (cards) {
        socket.emit('playerHand', cards);
    });

    //TODO
    //fetch all cards and emit to the socket
};

exports.playerDrawCard = function (socket) {
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
