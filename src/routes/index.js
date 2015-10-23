"use strict";

var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var firewall = require('../../security/firewall');
var scrypt = require('scrypt-for-humans');
var redis = require('redis').createClient();
var redisHelper = require('../../libs/helpers/redis');
var _ = require('underscore');
var Promise = require('bluebird');
var User = require('../database/mysql/models/user');
var Set = require('../database/mysql/models/set');
var Card = require('../database/mysql/models/card');

var lobbyController = require('../controllers/lobby');


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

router.get('/lobby', firewall.restrict, lobbyController.index);

router.get('/leave', firewall.restrict, function (req, res) {
    redis.zrangebyscoreAsync('games', req.session.game.id, req.session.game.id).then(function (game) {
        game = JSON.parse(game);
        game.players = _.without(game.players, _.findWhere(game.players, {id: req.session.user.id + ''}));

        game.players.forEach(function (player) {
            redis.set('current:' + player.id, JSON.stringify(game));
        });
        redis.del('current:' + req.session.user.id);
        redis.zremrangebyscore('games', game.id, game.id);
        redis.zadd('games', game.id, JSON.stringify(game));

        var gameId = game.id;

        redis.del('deck:' + gameId + ':' + req.session.user.id);
        redis.del('hand:' + gameId + ':' + req.session.user.id);
        redis.del('discard:' + gameId + ':' + req.session.user.id);
        redis.del('played:' + gameId + ':' + req.session.user.id);
        redis.del('committed:' + gameId + ':' + req.session.user.id);

        if (game.players.length === 0) {
            redis.del('storyDeck:' + gameId);
            redis.del('storyCards:' + gameId);
            redis.zremrangebyscore('games', gameId, gameId);
        }

        res.redirect('/lobby');
    });
});

router.get('/play', firewall.restrict, function (req, res) {
    var gameId = req.session.game.id;
    var playerId;
    var enemyId;

    req.session.game.players.forEach(function (player) {
        if (player.id == req.session.user.id) {
            playerId = player.id;
        } else {
            enemyId = player.id;
        }
    });

    var rStoryDeck = 'StoryDeck:' + gameId;
    var rStoryCards = 'StoryCards:' + gameId;

    var rPlayerDeck = 'Deck:' + gameId + ':' + playerId;
    var rPlayerHand = 'Hand:' + gameId + ':' + playerId;
    var rPlayerDiscard = 'Discard:' + gameId + ':' + playerId;
    var rPlayerPlayed = 'Played:' + gameId + ':' + playerId;
    var rPlayerCommitted = 'Committed:' + gameId + ':' + playerId;

    var rEnemyDeck = 'Deck:' + gameId + ':' + enemyId;
    var rEnemyHand = 'Hand:' + gameId + ':' + enemyId;
    var rEnemyDiscard = 'Discard:' + gameId + ':' + enemyId;
    var rEnemyPlayed = 'Played:' + gameId + ':' + enemyId;
    var rEnemyCommitted = 'Committed:' + gameId + ':' + enemyId;

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
        redis.zrangeAsync(rEnemyPlayed, 0, -1).then(redisHelper.dataToJSON),
        redis.zrangeAsync(rPlayerCommitted, 0, -1).then(redisHelper.dataToJSON),
        redis.zrangeAsync(rEnemyCommitted, 0, -1).then(redisHelper.dataToJSON)
    ]).then(function (result) {
        var i;

        var storyCards = [];
        var storyDeck = result[0];

        for (i = 0; i < 3; i++) {
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

        for (i = 0; i < playerDeck.length; i++) {
            playerDeck[i].cid = i + 1;
        }

        for (i = 0; i < 8; i++) {
            playerHand.push(playerDeck[i]);
        }

        for (i = 0; i < 8; i++) {
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
        var playerCommitted = result[7];

        var enemyHand = [];
        var enemyDeck = result[2];

        for (i = 0; i < enemyDeck.length; i++) {
            enemyDeck[i].cid = i + 1;
        }

        for (i = 0; i < 8; i++) {
            enemyHand.push(enemyDeck[i]);
        }

        for (i = 0; i < 8; i++) {
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
        var enemyCommitted = result[8];

        res.render('play.nunj', {
            storyCards: storyCards,
            playerDeckCounter: playerDeck.length,
            playerHand: playerHand,
            playerDiscardCounter: playerDiscard.length,
            playerDiscardTop: _.last(playerDiscard),
            playerPlayed: playerPlayed,
            playerCommitted: playerCommitted,
            enemyDeckCounter: enemyDeck.length,
            enemyHandCounter: enemyHand.length,
            enemyDiscardCounter: enemyDiscard.length,
            enemyDiscardTop: _.last(enemyDiscard),
            enemyPlayed: enemyPlayed,
            enemyCommitted: enemyCommitted
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
