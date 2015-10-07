var express = require('express');
var app = express();

var session = require('express-session');
var KnexSessionStore = require('connect-session-knex')(session);

var http = require('http').Server(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(http);

var nunjucks = require('nunjucks');

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
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.flashMessage = null;
    if (err) res.locals.flashMessage = {
        type: 'danger',
        message: err
    };
    if (msg) res.locals.flashMessage = {
        type: 'success',
        message: msg
    };
    next();
});

var users = {
    'lordjancso@gmail.com': {name: 'lordjancso'}
};

var hash = require('./auth/pass').hash;
hash('test', function (err, salt, hash) {
    if (err) throw err;
    // store the salt & hash in the "db"
    users['lordjancso@gmail.com'].salt = salt;
    users['lordjancso@gmail.com'].hash = hash;
});

function authenticate(name, pass, fn) {
    var user = users[name];
    // query the db for the given username
    if (!user) return fn(new Error('cannot find user'));
    // apply the same algorithm to the POSTed password, applying
    // the hash against the pass / salt, if there is a match we
    // found the user
    hash(pass, user.salt, function (err, hash) {
        if (err) return fn(err);
        if (hash == user.hash) return fn(null, user);
        fn(new Error('invalid password'));
    });
}

function restrict(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}

app.use(express.static('web'));

nunjucks.configure('views', {
    express: app
});

app.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

app.get('/cards', restrict, function (req, res) {
    res.render('cards.html', {
        url: req.url,
        user: req.session.user
    });
});

app.get('/login', function (req, res) {
    res.render('login.html', {
        url: req.url
    });
});

app.post('/login', function (req, res) {
    authenticate(req.body.email, req.body.password, function (err, user) {
        if (user) {
            // Regenerate session when signing in
            // to prevent fixation
            req.session.regenerate(function () {
                // Store the user's primary key
                // in the session store to be retrieved,
                // or in this case the entire user object
                req.session.user = user;
                req.session.success = 'Login successful!';
                res.redirect('/cards');
            });
        } else {
            req.session.error = 'Authentication failed, please check your username and password.';
            res.redirect('/login');
        }
    });
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
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