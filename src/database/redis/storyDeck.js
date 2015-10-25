"use strict";

var redis = require('../redis');
var Promise = require('bluebird');

Promise.promisifyAll(redis);

exports.all = function (gameId) {
    return redis.smembersAsync('storyDeck:' + gameId).then(function (cards) {
        if (!cards.length) {
            return false;
        }

        cards.forEach(function (card, index) {
            cards[index] = JSON.parse(card);
        });

        return cards;
    });
};

exports.count = function (gameId) {
    return redis.scardAsync('storyDeck:' + gameId).then(function (count) {
        return count;
    });
};

exports.draw = function (gameId) {
    var data = {};

    return redis.spopAsync('storyDeck:' + gameId).then(function (card) {
        redis.sadd('storyCards:' + gameId, card);

        data.card = JSON.parse(card);
    }).then(function () {
        return this.count(gameId);
    }).then(function (count) {
        data.count = count;

        return data;
    });
};
