var knex = require('../config/database');
var Promise = require('bluebird');
//var scrypt = require('scrypt-for-humans');

exports.authenticate = function (email, password) {
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
};

exports.restrict = function (req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
};
