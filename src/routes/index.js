"use strict";

var expressPromiseRouter = require('express-promise-router');
var router = expressPromiseRouter();
var firewall = require('../../security/firewall');
var scrypt = require('scrypt-for-humans');
var redis = require('redis').createClient();
var redisHelper = require('../../libs/helpers/redis');
var _ = require('../../libs/underscore');
var Promise = require('bluebird');
var User = require('../database/mysql/models/user');
var Set = require('../database/mysql/models/set');
var Card = require('../database/mysql/models/card');

var lobbyController = require('../controllers/lobby');
var playController = require('../controllers/play');

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
    return Promise.props({
        sets: Set.query(function (qb) {
            qb.orderBy('parent', 'ASC').orderBy('released_at', 'ASC');
        }).fetchAll(),
        cards: Card.filter(req.query)
    }).then(function (result) {
        var sets = {};

        result.sets.toJSON().forEach(function (_set) {
            if (_set.parent) {
                if (!sets.hasOwnProperty(_set.parent)) {
                    sets[_set.parent] = [];
                }

                sets[_set.parent].push(_set);
            } else {
                sets[_set.title] = _set;
            }
        });

        res.render('cards.nunj', {
            sets: sets,
            subtypes: _.sortKeysBy(require('../../documents/subtypes')),
            keywords: _.sortKeysBy(require('../../documents/keywords')),
            cards: result.cards.toJSON()
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

router.get('/play', firewall.restrict, function (req, res) {
    res.render('play.nunj');
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

router.get('/database', function (req, res) {
    var stringHelper = require('../helpers/stringHelper');
    var subtypes = require('../../documents/subtypes');
    var keywords = require('../../documents/keywords');
    var id = 1;

    if (req.query.id) {
        id = req.query.id;
    }

    return new Card({id: id}).fetch().then(function (card) {
        card = card.toJSON();

        if (card.subtype) {
            if (card.subtype.indexOf('.') > -1) {
                card.subtype = card.subtype.trim().split('. ');
            } else {
                card.subtype = card.subtype.trim().split(',');
            }
            card.subtype.forEach(function (subtype, j) {
                subtype = stringHelper.removeDots(subtype);
                subtype = stringHelper.slugify(subtype.trim());
                card.subtype[j] = subtype;
            });
        } else {
            card.subtype = [];
        }

        if (card.keyword) {
            card.keyword = card.keyword.trim().split(',');
            card.keyword.forEach(function (keyword, j) {
                keyword = stringHelper.slugify(keyword.trim());
                card.keyword[j] = keyword;
            });
        } else {
            card.keyword = [];
        }

        if (card.attribute == 'Transient' && card.keyword.indexOf('transient') == -1) {
            card.keyword.push('transient');
        }

        if (card.attribute == 'Zoog Resource' && card.keyword.indexOf('zoog') == -1) {
            card.keyword.push('zoog');
        }

        card.faction = stringHelper.slugify(card.faction);

        if (card.steadfastfaction) {
            card.steadfastfaction = stringHelper.slugify(card.steadfastfaction);
        }

        res.render('database.nunj', {
            card: card,
            subtypes: subtypes,
            keywords: keywords
        });
    });
});

router.post('/ajax/database', function (req, res) {
    Card.forge({id: req.body.id}).fetch({require: true}).then(function (card) {
        card.save({
            title: req.body.title,
            descriptor: req.body.descriptor || null,
            is_unique: req.body.is_unique,
            type: req.body.type,
            subtype: req.body.subtype || null,
            faction: req.body.faction,
            terror: req.body.terror,
            combat: req.body.combat,
            arcane: req.body.arcane,
            investigation: req.body.investigation,
            cost: req.body.cost,
            skill: req.body.skill,
            toughness: req.body.toughness,
            fated: req.body.fated,
            keyword: req.body.keyword || null,
            steadfastcount: req.body.steadfastcount || null,
            steadfastfaction: req.body.steadfastfaction || null,
            terror_booster: req.body.terror_booster,
            combat_booster: req.body.combat_booster,
            arcane_booster: req.body.arcane_booster,
            investigation_booster: req.body.investigation_booster
        }).then(function () {
            res.json({error: false, data: {message: 'Card details updated'}});
        }).catch(function (err) {
            res.status(500).json({error: true, data: {message: err.message}});
        });
    }).catch(function (err) {
        res.status(500).json({error: true, data: {message: err.message}});
    });
});

module.exports = router;
