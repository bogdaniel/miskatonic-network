var express = require('express');
var router = express.Router();
var knex = require('./database');
var hash = require('../security/pass').hash;

function authenticate(email, password, fn) {
    return knex('users').where('email', email).then(function (rows) {
        var user = rows[0];

        if (!user) return fn(new Error('cannot find user'));

        hash(password, function (err, hash) {
            if (err) return fn(err);
            if (hash == user.password) return fn(null, user);
            fn(new Error('invalid password'));
        });
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

router.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

router.get('/cards', restrict, function (req, res) {
    res.render('cards.html', {
        url: req.url,
        user: req.session.user
    });
});

router.get('/login', function (req, res) {
    res.render('login.html', {
        url: req.url
    });
});

router.post('/login', function (req, res) {
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

router.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

router.get('/registration', function (req, res) {
    res.render('registration.html', {
        url: req.url
    });
});

router.post('/registration', function (req, res) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    knex('users').insert({
        username: username,
        email: email,
        password: password,
        created_at: new Date(),
        updated_at: new Date()
    });

    res.redirect('/login');
});

module.exports = router;
