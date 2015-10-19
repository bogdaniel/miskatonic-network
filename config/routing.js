"use strict";

var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var firewall = require('../security/firewall');
var scrypt = require('scrypt-for-humans');
var redis = require('redis').createClient();
var redisHelper = require('../libs/helpers/redis');
var _ = require('underscore');
var math = require('../libs/math');
var Promise = require('bluebird');
var User = require('./model').User;
var Set = require('./model').Set;
var Card = require('./model').Card;

Promise.promisifyAll(redis);

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
    var gameId = 1;
    var playerId = 1;
    var enemyId = 2;

    var rStoryDeck = 'storyDeck:' + gameId;
    var rStoryCards = 'storyCards:' + gameId;

    var rPlayerDeck = 'deck:' + gameId + ':' + playerId;
    var rPlayerHand = 'hand:' + gameId + ':' + playerId;
    var rPlayerDiscard = 'discard:' + gameId + ':' + playerId;
    var rPlayerPlayed = 'played:' + gameId + ':' + playerId;

    var rEnemyDeck = 'deck:' + gameId + ':' + enemyId;
    var rEnemyHand = 'hand:' + gameId + ':' + enemyId;
    var rEnemyDiscard = 'discard:' + gameId + ':' + enemyId;
    var rEnemyPlayed = 'played:' + gameId + ':' + enemyId;

    return Promise.all([
        Card.where('type', '=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()');
        }).fetchAll().then(cards => cards.toJSON()),
        Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll().then(cards => cards.toJSON()),
        Card.where('type', '!=', 'Story').where('set_id', '=', 1).query(function (qb) {
            qb.orderByRaw('RAND()').limit(50);
        }).fetchAll().then(cards => cards.toJSON()),
        redis.zrangeAsync(rPlayerDiscard, 0, -1).then(redisHelper.dataToJSON),
        redis.zrangeAsync(rEnemyDiscard, 0, -1).then(redisHelper.dataToJSON),
        redis.zrangeAsync(rPlayerPlayed, 0, -1).then(redisHelper.dataToJSON),
        redis.zrangeAsync(rEnemyPlayed, 0, -1).then(redisHelper.dataToJSON)
    ]).then(function (result) {
        var i;

        var storyCards = [];
        var storyDeck = result[0];

        for (i in math.randomCards(3, storyDeck.length)) {
            storyCards.push(storyDeck[i]);
            storyDeck.splice(i, 1);
        }

        storyDeck.forEach(function (card) {
            redis.sadd(rStoryDeck, JSON.stringify(card));
        });

        storyCards.forEach(function (card) {
            redis.sadd(rStoryCards, JSON.stringify(card));
        });

        var playerHand = [];
        var playerDeck = result[1];

        for (i in math.randomCards(8, playerDeck.length)) {
            playerHand.push(playerDeck[i]);
            playerDeck.splice(i, 1);
        }

        playerDeck.forEach(function (card) {
            redis.sadd(rPlayerDeck, JSON.stringify(card));
        });

        playerHand.forEach(function (card) {
            redis.sadd(rPlayerHand, JSON.stringify(card));
        });

        var playerDiscard = result[3];
        var playerPlayed = result[5];

        var enemyHand = [];
        var enemyDeck = result[2];

        for (i in math.randomCards(8, enemyDeck.length)) {
            enemyHand.push(enemyDeck[i]);
            enemyDeck.splice(i, 1);
        }

        enemyDeck.forEach(function (card) {
            redis.sadd(rEnemyDeck, JSON.stringify(card));
        });

        enemyHand.forEach(function (card) {
            redis.sadd(rEnemyHand, JSON.stringify(card));
        });

        var enemyDiscard = result[4];
        var enemyPlayed = result[6];

        res.render('play.nunj', {
            storyCards: storyCards,
            playerDeckCounter: playerDeck.length,
            playerHand: playerHand,
            playerDiscardCounter: playerDiscard.length,
            playerDiscardTop: _.last(playerDiscard),
            playerPlayed: playerPlayed,
            enemyDeckCounter: enemyDeck.length,
            enemyHandCounter: enemyHand.length,
            enemyDiscardCounter: enemyDiscard.length,
            enemyDiscardTop: _.last(enemyDiscard),
            enemyPlayed: enemyPlayed
        });

        redis.del(rStoryDeck);
        redis.del(rStoryCards);

        redis.del(rPlayerDeck);
        redis.del(rPlayerHand);
        redis.del(rPlayerDiscard);
        redis.del(rPlayerPlayed);

        redis.del(rEnemyDeck);
        redis.del(rEnemyHand);
        redis.del(rEnemyDiscard);
        redis.del(rEnemyPlayed);
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
