$(function () {
    "use strict";

    socket.on('activeStoryCards', function (cards) {
        $.each(cards, function (index, card) {
            var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
            var cardFrame = $('<div>').addClass('card-frame card-story');
            cardFrame.append(cardImage);
            $('.row-story').append(cardFrame);
        });
    });
});
