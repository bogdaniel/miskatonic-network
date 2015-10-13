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
    filter: Promise.method(function (query) {
        var filter = [];
        var page = 1;

        if (query.title) {
            filter.title = query.title;
        }

        if (query.set) {
            filter.set_id = query.set;
        }

        if (query.faction) {
            filter.faction = query.faction;
        }

        if (query.type) {
            filter.type = query.type;
        }

        if (query.page) {
            page = query.page;
        }

        return new this().where(filter).query(function (qb) {
            qb.orderBy('num', 'ASC').limit(24).offset(page * 24 - 24);
        }).fetchAll();
    })
});
