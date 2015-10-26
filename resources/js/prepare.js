$(function () {
    "use strict";

    socket.on('activeStoryCards', function (cards) {
        $('.row-story').empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.row-story').append(cardFrame);
        });
    });

    socket.on('opponentPlayedCards', function (cards) {
        $('.opponent.row-played').empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.opponent.row-played').append(cardFrame);
        });
    });

    socket.on('playerPlayedCards', function (cards) {
        $('.player.row-played').empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.player.row-played').append(cardFrame);
        });
    });

    socket.on('opponentCommittedCards', function (data) {
        var storyCard = data.storyCard;
        var cards = data.cards;

        $('.opponent.row-committed .col-committed.committed-story-' + storyCard.cid).remove();
        var colCommitted = $('<div>').addClass('col-committed').addClass('committed-story-' + storyCard.cid);

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            colCommitted.append(cardFrame);
        });

        $('.opponent.row-committed').append(colCommitted);
    });

    socket.on('playerCommittedCards', function (data) {
        var storyCard = data.storyCard;
        var cards = data.cards;

        $('.player.row-committed .col-committed.committed-story-' + storyCard.cid).remove();
        var colCommitted = $('<div>').addClass('col-committed').addClass('committed-story-' + storyCard.cid);

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            colCommitted.append(cardFrame);
        });

        $('.player.row-committed').append(colCommitted);
    });

    socket.on('opponentDeckCount', function (count) {
        $('.row-opponent .draw-deck .count').text(count);
    });

    socket.on('playerDeckCount', function (count) {
        $('.row-player .draw-deck .count').text(count);
    });

    socket.on('playerHand', function (cards) {
        $('.row-hand').empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.row-hand').append(cardFrame);
        });
    });

    socket.on('opponentHandCount', function (count) {
        $('.row-opponent .hand-deck .count').text(count);
    });
});
