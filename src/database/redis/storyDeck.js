"use strict";

var redis = require('../redis');
var Promise = require('bluebird');
var storyCard = require('./storyCard');

Promise.promisifyAll(redis);

exports.all = function (gameId) {
    return redis.lrangeAsync('storyDeck:' + gameId, 0, -1).then(function (cards) {
        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.count = function (gameId) {
    return redis.llenAsync('storyDeck:' + gameId);
};

exports.add = function (gameId, card) {
    return redis.rpushAsync('storyDeck:' + gameId, JSON.stringify(card));
};

exports.draw = function (gameId) {
    return Promise.try(function () {
        return redis.rpopAsync('storyDeck:' + gameId);
    }).then(function (card) {
        return storyCard.add(gameId, card);
    });
};
