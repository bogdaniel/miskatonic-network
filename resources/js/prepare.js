function renderCard(card, type) {
    var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
    var cardFrame = $('<div>').addClass('card-frame').addClass('card-' + card.status);
    cardFrame.append(cardImage);

    return cardFrame;
}

$(function () {
    "use strict";

    socket.on('opponentPlayedCards', function (cards) {
        $('.opponent.row-played').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.opponent.row-played').append(cardFrame);
        });
    });

    socket.on('opponentCommittedCards', function (cards) {
        $('.opponent.row-committed').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.opponent.row-committed').append(cardFrame);
        });
    });

    socket.on('activeStoryCards', function (cards) {
        $('.row-story').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.row-story').append(cardFrame);
        });
    });

    socket.on('playerCommittedCards', function (cards) {
        $('.player.row-committed').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.player.row-committed').append(cardFrame);
        });
    });

    socket.on('playerPlayedCards', function (cards) {
        $('.player.row-played').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.player.row-played').append(cardFrame);
        });
    });

    socket.on('opponentDeckCount', function (count) {
        $('.row-opponent .draw-deck .count').text(count);
    });

    socket.on('opponentHandCount', function (count) {
        $('.row-opponent .hand-deck .count').text(count);
    });

    socket.on('playerDeckCount', function (count) {
        $('.row-player .draw-deck .count').text(count);
    });

    socket.on('playerHand', function (cards) {
        $('.row-hand').empty();

        $.each(cards, function (index, card) {
            var cardFrame = renderCard(card);
            $('.row-hand').append(cardFrame);
        });
    });
});
