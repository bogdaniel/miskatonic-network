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
    socket.on('chat message', function (message) {
        message = message.trim();

        if (message) {
            io.emit('chat message', {
                username: 'user1',
                message: message,
                created_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
        }
    });

    socket.on('disconnect', function () {
        //
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
