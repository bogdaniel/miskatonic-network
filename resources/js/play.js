$(function () {
    "use strict";

    function renderCard(card, type) {
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
        var cardFrame = $('<div>').addClass('card-frame').addClass(card.status).addClass(type);
        cardFrame.append(cardImage);

        return cardFrame;
    }

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
            var cardFrame = renderCard(card, 'card-story');
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

    socket.on('opponentDrawDeckCount', function (count) {
        $('.row-opponent .draw-deck .counter').text(count);
    });

    socket.on('opponentHandDeckCount', function (count) {
        $('.row-opponent .hand-deck .counter').text(count);
    });

    socket.on('playerDrawDeckCount', function (count) {
        $('.row-player .draw-deck .counter').text(count);
    });
});
