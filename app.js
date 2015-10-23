"use strict";

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session');
var knex = require('./src/database/mysql/knex');
var knexSessionStore = require('connect-session-knex')(session);
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var routes = require('./src/routes');
var moment = require('moment');
var redis = require('redis').createClient();
var Promise = require('bluebird');
var _ = require('underscore');

Promise.promisifyAll(redis);

app.use(express.static(__dirname + '/public'));
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

    redis.getAsync('current:' + userId).then(function (game) {
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
app.use(routes);
app.use(function (req, res, next) {
    res.status(404).send('Sorry cant find that!');
});
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).send('Something broke!');
});

nunjucks.configure(__dirname + '/src/views', {
    express: app
});

var chatSocket = require('./src/socket.io/chat');

io.on('connection', function (socket) {
    socket.username = socket.handshake.query.username;
    socket.userId = socket.handshake.query.userId;

    redis.getAsync('current:' + socket.userId).then(function (game) {
        if (game) {
            game = JSON.parse(game);

            socket.game = game;
        }
    });

    socket.on('join', function (room) {
        chatSocket.join(socket, room);
    });

    socket.on('chatMessage', function (message) {
        chatSocket.message(socket, message);
    });

    socket.on('disconnect', function () {
        chatSocket.leave(socket);
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
        redis.set('current:' + socket.userId, JSON.stringify(game));
        redis.zadd('games', game.id, JSON.stringify(game));

        io.emit('afterCreateGame', {
            game: game
        });
    });

    socket.on('onLeaveGame', function () {
        if (!socket.game) {
            return;
        }

        redis.zrangebyscoreAsync('games', socket.game.id, socket.game.id).then(function (game) {
            if (game) {
                game = JSON.parse(game);

                game.players = _.without(game.players, _.findWhere(game.players, {id: socket.userId}));
                game.players.forEach(function (player) {
                    redis.set('current:' + player.id, JSON.stringify(game));
                });
                redis.del('current:' + socket.userId);

                if (game.players.length === 0) {
                    redis.zremrangebyscore('games', game.id, game.id);
                } else {
                    redis.zremrangebyscore('games', game.id, game.id);
                    redis.zadd('games', game.id, JSON.stringify(game));
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

        redis.zrangebyscoreAsync('games', game.id, game.id).then(function (game) {
            game = JSON.parse(game);

            game.players.push({
                id: socket.userId,
                username: socket.username
            });

            socket.game = game;

            game.players.forEach(function (player) {
                redis.set('current:' + player.id, JSON.stringify(game));
            });
            redis.zremrangebyscore('games', game.id, game.id);
            redis.zadd('games', game.id, JSON.stringify(game));

            io.emit('afterJoinGame', {
                game: game
            });
        });
    });

    socket.on('onStartGame', function () {
        if (socket.game.players.length !== 2) {
            return;
        }

        redis.zrangebyscoreAsync('games', socket.game.id, socket.game.id).then(function (game) {
            game = JSON.parse(game);

            game.status = 'in-game';

            game.players.forEach(function (player) {
                redis.set('current:' + player.id, JSON.stringify(game));
            });
            redis.zremrangebyscore('games', game.id, game.id);
            redis.zadd('games', game.id, JSON.stringify(game));

            io.emit('afterStartGame', {
                game: game
            });
        });
    });

    socket.on('onCardDraw', function (data) {
        if (!(socket.game && socket.game.status == 'in-game')) {
            return;
        }

        var rDeck = 'deck:' + socket.game.id + ':' + socket.userId;
        var rHand = 'hand:' + socket.game.id + ':' + socket.userId;

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
