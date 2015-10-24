"use strict";

var Promise = require('bluebird');
var storyCards = require('../database/redis/storyCard');

exports.displayTable = function (socket) {
    var game = socket.game;

    storyCards.getActive(game.id).then(function(cards) {
        socket.emit('activeStoryCards', cards);
    });

    //TODO
    //fetch all cards and emit to the socket
};
