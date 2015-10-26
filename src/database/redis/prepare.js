"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var storyDeck = require('./storyDeck');
var storyCard = require('./storyCard');
var deck = require('./deck');

Promise.promisifyAll(redis);

exports.storyCards = function (gameId, cards) {
    var i;
    var _storyCards = [];
    var _storyDeck = cards;

    for (i = 0; i < _storyDeck.length; i++) {
        _storyDeck[i].cid = i + 1;
        _storyDeck[i].status = 'story';
    }

    for (i = 0; i < 3; i++) {
        _storyCards.push(_storyDeck[i]);
        _storyDeck.splice(i, 1);
    }

    _storyDeck.forEach(function (card) {
        storyDeck.add(gameId, card);
    });

    _storyCards.forEach(function (card) {
        storyCard.add(gameId, card);
    });
};

exports.playerDeck = function (gameId, playerId, cards) {
    var i;
    var playerDeck = cards;

    for (i = 0; i < playerDeck.length; i++) {
        playerDeck[i].cid = i + 1;
        playerDeck[i].status = 'active';
    }

    playerDeck.forEach(function (card) {
        deck.add(gameId, playerId, card);
    });
};
