"use strict";

var _ = require('underscore');
var randomHelper = require('../../helpers/randomHelper');
var stringHelper = require('../../helpers/stringHelper');
var redis = require('../redis');
var Promise = require('bluebird');
var storyDeck = require('./storyDeck');
var storyCard = require('./storyCard');
var deck = require('./deck');

Promise.promisifyAll(redis);

exports.storyCards = function (game, cards) {
    var _storyCards = [];
    var _storyDeck = _.shuffle(cards);
    var successTokens = {};

    successTokens['player' + game.players[0].id] = 0;
    successTokens['player' + game.players[1].id] = 0;

    _storyDeck.forEach(function (card, i) {
        _storyDeck[i].id = randomHelper.cardId();
        _storyDeck[i].status = 'story';
        _storyDeck[i].successTokens = successTokens;

        delete _storyDeck[i].data;
    });

    for (var i = 0; i < 3; i++) {
        _storyCards.push(_storyDeck[i]);
        _storyDeck.splice(i, 1);
    }

    _storyDeck.forEach(function (card) {
        storyDeck.add(game.id, card);
    });

    _storyCards.forEach(function (card) {
        storyCard.add(game.id, card);
    });

    return _.sortBy(_storyCards, 'id');
};

exports.playerDeck = function (gameId, playerId, cards) {
    var playerDeck = _.shuffle(cards);

    playerDeck.forEach(function (card, i) {
        playerDeck[i].id = randomHelper.cardId();
        playerDeck[i].ownerId = playerId;
        playerDeck[i].status = 'active';
        playerDeck[i].type = stringHelper.slugify(playerDeck[i].type);
        playerDeck[i].faction = stringHelper.slugify(playerDeck[i].faction);

        if (playerDeck[i].subtype) {
            playerDeck[i].subtype = playerDeck[i].subtype.trim().split('. ');
            playerDeck[i].subtype.forEach(function (subtype, j) {
                subtype = stringHelper.removeDots(subtype);
                subtype = stringHelper.slugify(subtype);
                playerDeck[i].subtype[j] = subtype;
            });
        }

        delete playerDeck[i].data;
    });

    playerDeck.forEach(function (card) {
        deck.add(gameId, playerId, card);
    });
};
