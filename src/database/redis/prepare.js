"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.storyCards = function (gameId, cards) {
    var i;
    var storyCards = [];
    var storyDeck = cards;

    for (i = 0; i < storyDeck.length; i++) {
        storyDeck[i].cid = i + 1;
        storyDeck[i].status = 'story';
    }

    for (i = 0; i < 3; i++) {
        storyCards.push(storyDeck[i]);
        storyDeck.splice(i, 1);
    }

    storyDeck.forEach(function (card) {
        redis.sadd('storyDeck:' + gameId, JSON.stringify(card));
    });

    storyCards.forEach(function (card) {
        redis.sadd('storyCards:' + gameId, JSON.stringify(card));
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
        redis.sadd('deck:' + gameId + ':' + playerId, JSON.stringify(card));
    });
};
