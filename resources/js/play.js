$(function () {
    "use strict";

    $('.gameboard').disableSelection();

    $(document).on('click', '.leave-game', function () {
        socket.emit('leave');
    });

    $(document).on('click', '.row-player .draw-deck', function () {
        if ($.isAllowed('drawCard')) {
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

    socket.on('opponentResourcedCard', function (data) {
        var resourceId = data.resourceId;
        var card = data.card;
        var cardFrame = $.renderCard(card);
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        $('.opponent.row-domain .domain-' + resourceId).prepend(cardFrame);
    });

    $(document).on('click', '#restore-insane', function () {
        //TODO
        //allow player to choose an insane card

        if ($.isAllowed('restoreInsane')) {
            socket.emit('restoreInsane');
        }
    });

    socket.on('playerRestoredInsane', function () {
        //TODO
    });

    socket.on('opponentRestoredInsane', function () {
        //TODO
    });

    $(document).on('click', '#refresh-all', function () {
        if ($.isAllowed('refreshAll')) {
            socket.emit('refreshAll');
        }
    });

    socket.on('playerRefreshedAll', function () {
        //TODO
        //remove domain drain markers

        $('.player.row-played .card-exhausted').each(function () {
            $(this).removeClass('card-exhausted').addClass('card-active');
        });
    });

    socket.on('opponentRefreshedAll', function () {
        //TODO
        //remove domain drain markers

        $('.opponent.row-played .card-exhausted').each(function () {
            $(this).removeClass('card-exhausted').addClass('card-active');
        });
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

    socket.on('gameInfo', function (data) {
        var content = '';
        var activePlayer = 'Opponent';

        if (data.activePlayer === 0) {
            activePlayer = 'Both';
        } else if (data.activePlayer == userId) {
            activePlayer = 'You';
        }

        content += 'Turn: ' + data.turn + '<br/>';
        content += 'Active player: ' + activePlayer + '<br/>';
        content += 'Phase: ' + data.phase + '<br/>';
        content += 'Step: ' + data.step + '<br/>';
        content += 'Actions: ' + data.actions.join(', ');

        if (data.activePlayer == userId) {
            if (data.phase == 'refresh') {
                content += '<hr/>';
                content += '<button id="restore-insane" type="button">RestoreInsane</button>';
                content += '<button id="refresh-all" type="button">RefreshAll</button>';
            }
        }

        $('.control').html(content);

        gameInfo = data;
    });
});

var gameInfo;
