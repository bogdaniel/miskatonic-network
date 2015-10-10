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

app.use(express.static('web'));
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

nunjucks.configure('views', {
    express: app
});

io.on('connection', function (socket) {
    socket.on('join', function (user) {
        var oldRoom = socket.room;

        socket.leave(socket.room);
        socket.room = user.room;

        if (!user.username) {
            socket.username = 'Guest';
        } else {
            socket.username = user.username;
        }

        socket.join(user.room);

        var userList = [];
        for (socketId in io.nsps['/'].adapter.rooms[socket.room]) {
            var userObj = io.sockets.connected[socketId];

            userList.push({
                username: userObj.username
            });
        }

        io.to(socket.room).emit('userList', userList);

        if (oldRoom) {
            var oldRoomUserList = io.nsps['/'].adapter.rooms[oldRoom];
            io.to(oldRoom).emit('userList', oldRoomUserList);
        }
    });

    socket.on('chat message', function (message) {
        message = message.trim();

        if (message) {
            io.to(socket.room).emit('chat message', {
                username: 'user1',
                message: message,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }
    });

    socket.on('disconnect', function () {
        socket.leave(socket.room);
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
