"use strict";

exports.dataToJSON = function (data) {
    var cards = [];

    data.forEach(function (card) {
        cards.push(JSON.parse(card));
    });

    return cards;
};
