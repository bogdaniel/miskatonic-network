var knex = require('./mysql/knex');
var bookshelf = require('bookshelf')(knex);

module.exports = bookshelf;
