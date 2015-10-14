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

    res.locals.app = {
        url: req.url,
        user: req.session.user
    };

    next();
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
        socket.username = user.username;

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
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
