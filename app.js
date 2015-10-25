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

    require('./src/database/redis/lobby').current(userId).then(function (game) {
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
var lobbySocket = require('./src/socket.io/lobby');
var playSocket = require('./src/socket.io/play');

io.of('/lobby').on('connection', function (socket) {
    socket.username = socket.handshake.query.username;
    socket.userId = socket.handshake.query.userId;

    lobbySocket.current(socket).then(function () {
        lobbySocket.displayGames(socket);
    });

    socket.on('create', function (data) {
        lobbySocket.create(socket, data);
    });

    socket.on('leave', function () {
        lobbySocket.leave(socket);
    });

    socket.on('join', function (data) {
        lobbySocket.join(socket, data);
    });

    socket.on('start', function () {
        lobbySocket.start(socket);
    });
});

io.of('/play').on('connection', function (socket) {
    socket.username = socket.handshake.query.username;
    socket.userId = socket.handshake.query.userId;

    lobbySocket.current(socket).then(function () {
        playSocket.displayTable(socket);
    });

    socket.on('leave', function () {
        lobbySocket.leave(socket);
    });

    socket.on('playerDrawCard', function (data) {
        playSocket.playerDrawCard(socket);
    });
});

io.of('/chat').on('connection', function (socket) {
    socket.username = socket.handshake.query.username;
    socket.userId = socket.handshake.query.userId;

    socket.on('join', function (room) {
        chatSocket.join(socket, room);
    });

    socket.on('message', function (message) {
        chatSocket.message(socket, message);
    });

    socket.on('disconnect', function () {
        chatSocket.leave(socket);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
