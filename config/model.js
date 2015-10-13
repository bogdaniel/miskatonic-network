var knex = require('./database');
var bookshelf = require('bookshelf')(knex);
var Promise = require('bluebird');
var scrypt = require('scrypt-for-humans');

exports.User = bookshelf.Model.extend({
    tableName: 'users',
    hasTimestamps: true
}, {
    login: Promise.method(function (email, password) {
        if (!email || !password) {
            throw new Error('Email and password are both required');
        }

        return new this({email: email.toLowerCase().trim()}).fetch({require: true}).tap(function (user) {
            return scrypt.verifyHash(password, user.get('password'));
        });
    })
});

exports.Set = bookshelf.Model.extend({
    tableName: 'sets'
}, {
    //
});

exports.Card = bookshelf.Model.extend({
    tableName: 'cards'
}, {
    //
});
