$(function () {
    "use strict";

    $(document).on('click', '.leave-game', function () {
        socket.emit('leave');
    });

    $(document).on('click', '.row-player .draw-deck', function () {
        socket.emit('drawCard');
    });

    socket.on('playerDrawnCard', function (data) {
        $('.row-player .draw-deck .count').text(data.count);
        var cardFrame = $.renderCard(data.card);

        $('.row-hand').append(cardFrame);
    });

    socket.on('opponenetDrawnCard', function (count) {
        $('.row-opponent .draw-deck .count').text(count);
    });

    socket.on('opponentPlayedCard', function(card) {
        var cardFrame = $.renderCard(card);

        $('.opponent.row-played').append(cardFrame);
    });
});
