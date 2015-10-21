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
var _ = require('underscore');

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
    socket.userId = socket.handshake.query.userId;

    redis.getAsync('Current:' + socket.userId).then(function (game) {
        if (game) {
            game = JSON.parse(game);

            socket.game = game;
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
        if (socket.game) {
            return;
        }

        var game = {
            id: (new Date()).getTime(),
            title: data.title,
            status: 'lobby',
            is_started: false,
            players: [{id: socket.userId, username: socket.username}],
            allow_spectators: false,
            created_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };

        socket.game = game;
        redis.set('Current:' + socket.userId, JSON.stringify(game));
        redis.zadd('Games', game.id, JSON.stringify(game));

        io.emit('afterCreateGame', {
            game: game
        });
    });

    socket.on('onLeaveGame', function () {
        if (!socket.game) {
            return;
        }

        redis.zrangebyscoreAsync('Games', socket.game.id, socket.game.id).then(function (game) {
            if (game) {
                game = JSON.parse(game);

                game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
                game.players.forEach(function (player) {
                    redis.set('Current:' + player.id, JSON.stringify(game));
                });
                redis.del('Current:' + socket.userId);

                if (game.players.length === 0) {
                    redis.zremrangebyscore('Games', game.id, game.id);
                } else {
                    redis.zremrangebyscore('Games', game.id, game.id);
                    redis.zadd('Games', game.id, JSON.stringify(game));
                }

                delete socket.game;

                io.emit('afterLeaveGame', {
                    game: game
                });
            }
        });
    });

    socket.on('onJoinGame', function (game) {
        if (socket.game) {
            return;
        }

        redis.zrangebyscoreAsync('Games', game.id, game.id).then(function (game) {
            game = JSON.parse(game);

            game.players.push({
                id: socket.userId,
                username: socket.username
            });

            socket.game = game;

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

    socket.on('onStartGame', function () {
        if (socket.game.players.length !== 2) {
            return;
        }

        redis.zrangebyscoreAsync('Games', socket.game.id, socket.game.id).then(function (game) {
            game = JSON.parse(game);

            game.status = 'in-game';

            game.players.forEach(function (player) {
                redis.set('Current:' + player.id, JSON.stringify(game));
            });
            redis.zremrangebyscore('Games', game.id, game.id);
            redis.zadd('Games', game.id, JSON.stringify(game));

            io.emit('afterStartGame', {
                game: game
            });
        });
    });

    socket.on('onCardDraw', function (data) {
        if (!(socket.game && socket.game.status == 'in-game')) {
            return;
        }

        var rDeck = 'Deck:' + socket.game.id + ':' + socket.userId;
        var rHand = 'Hand:' + socket.game.id + ':' + socket.userId;

        redis.spopAsync(rDeck).then(function (card) {
            redis.sadd(rHand, card);

            io.emit('afterCardDraw', {
                userId: socket.userId,
                card: JSON.parse(card)
            });
        });
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
