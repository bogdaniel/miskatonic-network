"use strict";

var game = require('../database/redis/game');

exports.index = function (req, res) {
    game.all().then(function (games) {
        res.render('lobby.nunj', {
            games: games
        });
    });
};

exports.leave = function () {
    //
};
