"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session');
var knex = require('./config/database');
var knexSessionStore = require('connect-session-knex')(session);
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var routing = require('./config/routing');
var moment = require('moment');
var redis = require('redis').createClient();
var Promise = require('bluebird');

Promise.promisifyAll(redis);

app.use(express.static(__dirname + '/web'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    secret: 'keyboard cat',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    resave: false,
    saveUninitialized: false,
    store: new knexSessionStore({
        knex: knex,
        tablename: 'sessions'
    })
}));
app.use(function (req, res, next) {
    var error = req.session.error;
    var success = req.session.success;

    delete req.session.error;
    delete req.session.success;

    res.locals.flashMessage = null;

    if (error) {
        res.locals.flashMessage = {
            type: 'danger',
            message: error
        };
    }

    if (success) {
        res.locals.flashMessage = {
            type: 'success',
            message: success
        };
    }

    var userId = null;

    if (req.session.user) {
        userId = req.session.user.id;
    }

    redis.getAsync('Current:' + userId).then(function (game) {
        game = JSON.parse(game);

        req.session.game = game;

        res.locals.app = {
            url: req.url,
            user: req.session.user,
            game: game
        };

        next();
    });
});
app.use(routing);
app.use(function (req, res, next) {
    res.status(404).send('Sorry cant find that!');
});
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).send('Something broke!');
});

nunjucks.configure(__dirname + '/views', {
    express: app
});

io.on('connection', function (socket) {
    socket.username = socket.handshake.query.username;
    socket.userid = socket.handshake.query.userid;

    redis.getAsync('Current:' + socket.userid).then(function (game) {
        if (game) {
            game = JSON.parse(game);

            socket.gameId = game.id;
        }
    });

    function leaveRoom() {
        var room = socket.room;

        socket.leave(socket.room);
        socket.room = null;

        var userList = [];
        for (var socketId in io.nsps['/'].adapter.rooms[room]) {
            var userObj = io.sockets.connected[socketId];

            userList.push({
                username: userObj.username
            });
        }

        io.to(room).emit('userList', userList);
    }

    socket.on('join', function (user) {
        leaveRoom();

        socket.join(user.room);
        socket.room = user.room;

        var userList = [];
        for (var socketId in io.nsps['/'].adapter.rooms[socket.room]) {
            var userObj = io.sockets.connected[socketId];

            userList.push({
                username: userObj.username
            });
        }

        io.to(socket.room).emit('userList', userList);

        redis.lrange('chat_' + socket.room, 0, -1, function (error, reply) {
            socket.emit('archiveMessages', reply);
        });
    });

    socket.on('chatMessage', function (message) {
        message = message.trim();

        if (message) {
            message = {
                username: socket.username,
                message: message,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            };

            io.to(socket.room).emit('chatMessage', message);

            redis.rpush('chat_' + socket.room, JSON.stringify(message));
            redis.llen('chat_' + socket.room, function (error, reply) {
                if (reply > 50) {
                    redis.lpop('chat_' + socket.room);
                }
            });
        }
    });

    socket.on('disconnect', function () {
        leaveRoom();
    });

    socket.on('onCreateGame', function (data) {
        var game = {
            id: (new Date).getTime(),
            title: data.title,
            status: 'lobby',
            is_started: false,
            players: [{id: socket.userid, username: socket.username}],
            allow_spectators: false,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        socket.gameId = game.id;
        redis.set('Current:' + socket.userid, JSON.stringify(game));
        redis.zadd('Games', game.id, JSON.stringify(game));

        io.emit('afterCreateGame', {
            game: game
        });
    });

    socket.on('onLeaveGame', function () {
        redis.zrangebyscoreAsync('Games', socket.gameId, socket.gameId).then(function (game) {
            if (game) {
                game = JSON.parse(game);

                game.players.forEach(function (player) {
                    redis.del('Current:' + player.id);
                });

                game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userid}));

                if (game.players.length == 0) {
                    redis.zremrangebyscore('Games', socket.gameId, socket.gameId);
                } else {
                    redis.zremrangebyscore('Games', socket.gameId, socket.gameId);
                    redis.zadd('Games', game.id, JSON.stringify(game));
                }

                io.emit('afterLeaveGame', {
                    game: game
                });

                delete socket.gameId;
            }
        });
    });

    socket.on('onJoinGame', function (game) {
        redis.zrangebyscoreAsync('Games', game.id, game.id).then(function (game) {
            game = JSON.parse(game);

            game.players.push({
                id: socket.userid,
                username: socket.username
            });

            socket.gameId = game.id;

            game.players.forEach(function (player) {
                redis.set('Current:' + player.id, JSON.stringify(game));
            });
            redis.zremrangebyscore('Games', game.id, game.id);
            redis.zadd('Games', game.id, JSON.stringify(game));

            io.emit('afterJoinGame', {
                game: game
            });
        });
    });

    socket.on('onCardDraw', function (data) {
        var gameId = 1;
        var rDeck = 'Deck:' + gameId + ':' + socket.userid;
        var rHand = 'Hand:' + gameId + ':' + socket.userid;

        redis.spopAsync(rDeck).then(function (card) {
            redis.sadd(rHand, card);

            io.emit('afterCardDraw', {
                userid: socket.userid,
                card: JSON.parse(card)
            });
        });
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
