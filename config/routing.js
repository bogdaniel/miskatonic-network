var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var firewall = require('../security/firewall');
var scrypt = require('scrypt-for-humans');
var redis = require('redis').createClient();
var math = require('../libs/math');
var Promise = require('bluebird');
var User = require('./model').User;
var Set = require('./model').Set;
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
    return Promise.all([
        Set.query(function (qb) {
            qb.orderBy('parent', 'ASC').orderBy('released_at', 'ASC');
        }).fetchAll(),
        Card.filter(req.query)
    ]).then(function (result) {
        res.render('cards.nunj', {
            sets: result[0].toJSON(),
            cards: result[1].toJSON()
        });
    });
});

router.get('/ajax/cards', function (req, res) {
    return Promise.try(function () {
        return Card.filter(req.query);
    }).then(function (cards) {
        res.end(JSON.stringify(cards.toJSON()));
    });
});

router.get('/deck-builder', firewall.restrict, function (req, res) {
    res.render('deck-builder.nunj');
});

router.get('/play', function (req, res) {
    return Promise.all([
        Card.where('type', '=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()');
        }).fetchAll(),
        Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll(),
        Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll()
    ]).then(function (result) {
        var i;

        var storyCards = [];
        var storyDeck = result[0].toJSON();
        for (i in math.randomCards(3, storyDeck.length)) {
            storyCards.push(storyDeck[i]);
        }
        for (i in math.randomCards(3, storyDeck.length)) {
            storyDeck.splice(i, 1);
        }

        var playerCards = [];
        var playerDeck = result[1].toJSON();
        for (i in math.randomCards(8, playerDeck.length)) {
            playerCards.push(playerDeck[i]);
        }
        for (i in math.randomCards(3, playerDeck.length)) {
            playerDeck.splice(i, 1);
        }

        res.render('play.nunj', {
            storyCards: storyCards,
            playerCards: playerCards
        });
    });
});

router.get('/about', function (req, res) {
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
        return new User({
            username: username,
            email: email,
            password: passwordHash,
            created_at: new Date(),
            updated_at: new Date()
        }).save();
    }).then(function (user) {
        user.omit('password');
        req.session.regenerate(function () {
            req.session.user = user;
            req.session.success = 'Login successful!';
            res.redirect('/cards');
        });
    });
});

router.get('/settings', firewall.restrict, function (req, res) {
    res.render('settings.nunj');
});

module.exports = router;
