"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);



exports.removeAndDrawStoryCard = function (gameId, cardId) {
    var storyCards = [];

    this.getStoryCards(gameId).then(function (cards) {
        cards.forEach(function (card) {
            if (card.id !== cardId) {
                storyCards.push(card);
            }
        });
    });

    redis.spopAsync('storyDeck:' + gameId).then(function (card) {
        storyCards.push(card);
    }).then(function () {
        redis.del('storyCards:' + gameId);

        storyCards.forEach(function (card) {
            redis.sadd('storyCards:' + gameId, JSON.stringify(card));
        });
    });
};
