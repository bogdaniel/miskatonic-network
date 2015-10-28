$(function () {
    "use strict";

    //storyCards

    socket.on('activeStoryCards', function (cards) {
        $('.row-story').empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            $('.row-story').append(cardFrame);
        });
    });

    //hand

    $.setSortable('.row-hand');

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

    //playedCards

    $.setSortable('.player.row-played');

    $('.player.row-played').droppable({
        accept: '.row-hand .card-frame',
        drop: $.playCard,
        over: $.droppableOver,
        out: $.droppableOut
    });

    function playedCards(owner, cards) {
        var container = $('.' + owner + '.row-played');

        container.empty();

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            container.append(cardFrame);
        });
    }

    socket.on('playerPlayedCards', function (cards) {
        playedCards('player', cards);
    });

    socket.on('opponentPlayedCards', function (cards) {
        playedCards('opponent', cards);
    });

    //committedCards

    function committedCards(owner, data) {
        var storyCard = data.storyCard;
        var cards = data.cards;

        $('.' + owner + '.row-committed .col-committed.committed-story-' + storyCard.cid).remove();
        var colCommitted = $('<div>').addClass('col-committed').addClass('committed-story-' + storyCard.cid).attr('data-id', storyCard.cid);

        $.each(cards, function (index, card) {
            var cardFrame = $.renderCard(card);
            colCommitted.append(cardFrame);
        });

        $('.' + owner + '.row-committed').append(colCommitted);
    }

    socket.on('playerCommittedCards', function (data) {
        committedCards('player', data);

        $.setSortable('.player.row-committed .col-committed');

        $('.player.row-committed .col-committed').droppable({
            accept: '.player.row-played .card-frame',
            drop: $.commitCard,
            over: $.droppableOver,
            out: $.droppableOut
        });
    });

    socket.on('opponentCommittedCards', function (data) {
        committedCards('opponent', data);
    });

    //domains

    //TODO

    //resourcedCards

    function resourcedCards(owner, data) {
        $.each(data.cards, function (i, card) {
            $.resourceCard(owner, data.domain, card);
        });
    }

    socket.on('playerResourcedCards', function (data) {
        resourcedCards('player', data);

        $('.player.row-domain .domain-' + data.domain.id).droppable({
            accept: '.row-hand .card-frame',
            drop: $.playerResourceCard,
            over: $.droppableOver,
            out: $.droppableOut
        });
    });

    socket.on('opponentResourcedCards', function (data) {
        resourcedCards('opponent', data);
    });

    //deck

    socket.on('opponentDeckCount', function (count) {
        $('.row-opponent .draw-deck .count').text(count);
    });

    socket.on('playerDeckCount', function (count) {
        $('.row-player .draw-deck .count').text(count);
    });
});
