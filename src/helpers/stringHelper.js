"use strict";

exports.slugify = function (text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

exports.removeDots = function (text) {
    return text.toString().trim()
        .replace(/\.+/g, '');
};
