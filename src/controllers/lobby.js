var moment = require('moment');
var random = require('../helpers/random');
var game = require('../database/redis/game');

exports.index = function (req, res) {
    game.all().then(function (games) {
        res.render('lobby.nunj', {
            games: games
        });
    });
};

exports.create = function (data) {
    var game = {
        id: random.guid(),
        title: data.title,
        status: 'lobby',
        is_started: false,
        players: [{id: data.userId, username: data.username}],
        allow_spectators: false,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };


};

exports.leave = function () {
    //
};
