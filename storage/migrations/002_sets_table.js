"use strict";

exports.up = function (knex, Promise) {
    return knex.schema.createTable('sets', function (table) {
        table.increments('id').primary();
        table.string('title').notNullable().unique();
        table.string('parent');
        table.integer('card_number').notNullable();
        table.date('released_at').notNullable();
    }).then(function () {
        console.log('sets table created.');
    });
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTable('sets').then(function () {
        console.log('sets table dropped.');
    });
};
