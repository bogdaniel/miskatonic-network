exports.up = function (knex) {
    return knex.schema.createTable('cards', function (table) {
        table.increments('id');
        table.string('title').notNullable();
        table.string('descriptor');
        table.string('type').notNullable();
        table.string('subtype');
        table.integer('cost').notNullable();
        table.integer('skill').notNullable();
        table.integer('terror').notNullable();
        table.integer('combat').notNullable();
        table.integer('arcane').notNullable();
        table.integer('investigation').notNullable();
        table.string('faction').notNullable();
        table.string('text');
        table.string('flavor');
        table.string('setname').notNullable();
        table.string('attribute');
        table.integer('steadfastcount');
        table.string('steadfastfaction');
        table.bool('is_unique').notNullable();
        table.bool('is_banned').notNullable();
        table.string('image_url').notNullable();
        table.string('image_size').notNullable();
        table.string('card_url').notNullable();
        table.integer('max').notNullable();
        table.integer('packquantity').notNullable();
        table.string('num').notNullable();
        table.string('illustrator');
        table.integer('rating').notNullable();
        table.text('data').notNullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
    });
};

exports.down = function (knex, Promise) {
    return knex.schema.dropTableIfExists('cards');
};