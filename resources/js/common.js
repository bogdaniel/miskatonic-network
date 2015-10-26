$(function () {
    "use strict";

    $.renderCard = function (card) {
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
        var cardFrame = $('<div>').addClass('card-frame').addClass('card-' + card.status).attr('data-id', card.cid);
        cardFrame.append(cardImage);

        return cardFrame;
    };

    $.playCardfromHand = function (event, ui) {
        var card = ui.item;


    };
});
