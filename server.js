var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session');
var store = require('./config/database');
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var routing = require('./config/routing');
var auth = require('./security/auth');

app.use(express.static('web'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(session({
    secret: 'keyboard cat',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    resave: false,
    saveUninitialized: false,
    store: store
}));
app.use(function (req, res, next) {
    var error = req.session.error;
    var success = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.flashMessage = null;
    if (error) res.locals.flashMessage = {
        type: 'danger',
        message: error
    };
    if (success) res.locals.flashMessage = {
        type: 'success',
        message: success
    };
    next();
});
app.use(routing);

nunjucks.configure('views', {
    express: app
});

var users = {
    'lordjancso@gmail.com': {name: 'lordjancso'}
};

var hash = require('./security/pass').hash;
hash('test', function (err, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users['lordjancso@gmail.com'].salt = salt;
    users['lordjancso@gmail.com'].hash = hash;
});

io.on('connection', function (socket) {
    //console.log('a user connected');

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', function () {
        //console.log('user disconnected');
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});