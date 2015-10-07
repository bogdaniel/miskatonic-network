var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var Promise = require('bluebird');
var knex = require('./database');
var firewall = require('../security/firewall');
//var scrypt = require('scrypt-for-humans');

function authenticate(email, password) {
    return Promise.try(function () {
        return knex('users').where('email', email);
    }).then(function (rows) {
        if (rows.length !== 1) {
            throw new Error('cannot find user');
        }

        var user = rows[0];

        return Promise.try(function () {
            return scrypt.verifyHash(password, user.password);
        }).then(function (valid) {
            return user;
        });
    });
}

router.post('/login', function (req, res) {
    return Promise.try(function () {
        return authenticate(req.body.email, req.body.password);
    }).then(function (user) {
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
    }).catch(scrypt.PasswordError, function (error) {
        req.session.error = 'Authentication failed, please check your username and password.';
        res.redirect('/login');
    });
});

router.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

router.get('/cards', firewall.restrict, function (req, res) {
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
