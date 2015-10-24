"use strict";

var lobby = require('../database/redis/lobby');

exports.index = function (req, res) {
    lobby.all().then(function (games) {
        res.render('lobby.nunj', {
            games: games
        });
    });
};

exports.leave = function () {
    //
};
