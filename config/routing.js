var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var firewall = require('../security/firewall');
var scrypt = require('scrypt-for-humans');
var Promise = require('bluebird');
var User = require('./model').User;
var Card = require('./model').Card;

router.post('/login', function (req, res) {
    return User.login(req.body.email, req.body.password).then(function (user) {
        user.omit('password');
        req.session.regenerate(function () {
            req.session.user = user;
            req.session.success = 'Login successful!';
            res.redirect('/cards');
        });
    }).catch(User.NotFoundError, function () {
        req.session.error = 'User not found.';
        res.redirect('/login');
    }).catch(scrypt.PasswordError, function () {
        req.session.error = 'Invalid password.';
        res.redirect('/login');
    }).catch(Error, function (error) {
        req.session.error = error.message;
        res.redirect('/login');
    });
});

router.get('/', function (req, res) {
    res.render('index.nunj');
});

router.get('/cards', function (req, res) {
    return Card.where({
        setname: 'Core Set'
    }).fetchAll().then(function (cards) {
        res.render('cards.nunj', {
            cards: cards.toJSON()
        });
    });
});

router.get('/deck-builder', firewall.restrict, function (req, res) {
    res.render('deck-builder.nunj');
});

router.get('/play', firewall.restrict, function (req, res) {
    res.render('play.nunj');
});

router.get('/about', firewall.restrict, function (req, res) {
    res.render('about.nunj');
});

router.get('/login', function (req, res) {
    res.render('login.nunj');
});

router.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

router.get('/registration', function (req, res) {
    res.render('registration.nunj');
});

router.post('/registration', function (req, res) {
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    return Promise.try(function () {
        return scrypt.hash(password);
    }).then(function (passwordHash) {
        new User({
            username: username,
            email: email,
            password: passwordHash,
            created_at: new Date(),
            updated_at: new Date()
        }).save().then(function (user) {
            user.omit('password');
            req.session.regenerate(function () {
                req.session.user = user;
                req.session.success = 'Login successful!';
                res.redirect('/cards');
            });
        });
    })
});

router.get('/settings', firewall.restrict, function (req, res) {
    res.render('settings.nunj');
});

module.exports = router;
