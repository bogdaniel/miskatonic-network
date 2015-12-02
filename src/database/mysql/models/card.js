"use strict";

var mysql = require('../../mysql');
var Promise = require('bluebird');

module.exports = mysql.Model.extend({
    tableName: 'cards'
}, {
    filter: Promise.method(function (query) {
        var filter = [];
        var title = '';
        var subtype = '';
        var keyword = '';
        var page = 1;

        if (query.title) {
            title = query.title;
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

        if (query.subtype) {
            subtype = query.subtype;
        }

        if (query.keyword) {
            keyword = query.keyword;
        }

        if (query.page) {
            page = query.page;
        }

        var cards = new this().where(filter).query(function (qb) {
            qb.orderBy('num', 'ASC').limit(24).offset(page * 24 - 24);
        });

        if (title) {
            cards.where('title', 'LIKE', '%' + title + '%');
        }

        if (subtype) {
            cards.where('subtype', 'LIKE', '%' + subtype + '%');
        }

        if (keyword) {
            cards.where('keyword', 'LIKE', '%' + keyword + '%');
        }

        return cards.fetchAll();
    }),
    findInOrder: Promise.method(function (array) {
        return new this().query('whereIn', 'id', array).query(function (qb) {
            qb.orderByRaw('find_in_set(id, "' + array.join() + '")');
        }).fetchAll();
    })
});
