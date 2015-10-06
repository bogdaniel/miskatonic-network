var express = require('express');
var app = express();
var session = require('express-session');
var KnexSessionStore = require('connect-session-knex')(session);
var nunjucks = require('nunjucks');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var common = require('./common');
var config = common.config();

var Knex = require('knex');
var knex = Knex({
    client: 'mysql2',
    connection: {
        host: config.database_host,
        user: config.database_user,
        password: config.database_password,
        database: config.database_name
    }
});

var store = new KnexSessionStore({
    knex: knex,
    tablename: 'sessions'
});

app.use(session({
    secret: 'keyboard cat',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    store: store
}));

app.use(express.static('web'));

nunjucks.configure('views', {
    express: app
});

app.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

app.get('/cards', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});