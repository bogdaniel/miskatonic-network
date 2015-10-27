$(function () {
    "use strict";

    $(document).on('click', '.leave-game', function () {
        socket.emit('leave');
    });

    $(document).on('click', '.row-player .draw-deck', function () {
        if ($.inArray('drawCard', gameActions) > -1) {
            socket.emit('drawCard');
        }
    });

    socket.on('playerDrawnCard', function (data) {
        $('.row-player .draw-deck .count').text(data.count);
        var cardFrame = $.renderCard(data.card);

        $('.row-hand').append(cardFrame);
    });

    socket.on('opponenetDrawnCard', function (count) {
        $('.row-opponent .draw-deck .count').text(count);
    });

    socket.on('opponentPlayedCard', function (card) {
        var cardFrame = $.renderCard(card);
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        $('.opponent.row-played').append(cardFrame);
    });

    socket.on('opponentCommittedCard', function (data) {
        var storyId = data.storyId;
        var card = data.card;
        var cardFrame = $.renderCard(card);

        $('.opponent.row-played .card-frame[data-id=' + card.cid + ']').remove();
        $('.opponent.row-committed .committed-story-' + storyId).append(cardFrame);
    });

    socket.on('opponentResourcedCard', function (data) {
        var resourceId = data.resourceId;
        var card = data.card;
        var cardFrame = $.renderCard(card);
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        $('.opponent.row-domain .domain-' + resourceId).prepend(cardFrame);
    });

    socket.on('gameActions', function (actions) {
        gameActions = actions;
    });
});
