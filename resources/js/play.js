$(function () {
    "use strict";

    $('.gameboard').disableSelection();

    $(document).on('click', '.leave-game', function () {
        socket.emit('leave');
    });

    //drawnCard

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

    //domain

    $(document).on('click', '.player.row-domain .domain', function () {
        if (!$.isAllowed('playCard') || ($(this).hasClass('domain-drained') && !$(this).hasClass('domain-active'))) {
            return false;
        }

        if ($(this).hasClass('target')) {
            $(this).removeClass('target');
            $(this).find('.icon-target').remove();
        } else {
            var domains = $('.player.row-domain .domain');
            var iconTarget = $('<div>').addClass('icon icon-target').append($('<img>').attr('src', '/images/target.jpg'));

            domains.removeClass('target');
            domains.find('.icon-target').remove();
            $(this).addClass('target');
            $(this).append(iconTarget);
        }
    });

    socket.on('opponentDrainedDomain', function (domainId) {
        $.drainDomain('opponent', domainId);
    });

    //resourcedCard

    socket.on('opponentResourcedCard', function (data) {
        var domainId = data.domainId;
        var domain = $('.opponent.row-domain .domain-' + domainId);
        var card = data.card;
        var cardFrame = $.renderCard(card);
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        domain.prepend(cardFrame);

        var resources = domain.data('resources') || {};
        if (resources[card.faction]) {
            resources[card.faction] += 1;
        } else {
            resources[card.faction] = 1;
        }
        domain.data('resources', resources);

        //TODO
        //display domain resource marker
    });

    //refreshPhase

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
        $.refreshDomain('player', 0);

        $('.player.row-played .card-exhausted').each(function () {
            $(this).removeClass('card-exhausted').addClass('card-active');
        });
    });

    socket.on('opponentRefreshedAll', function () {
        $.refreshDomain('opponent', 0);

        $('.opponent.row-played .card-exhausted').each(function () {
            $(this).removeClass('card-exhausted').addClass('card-active');
        });
    });

    //playedCard

    socket.on('opponentPlayedCard', function (card) {
        var cardFrame = $.renderCard(card);
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        $('.opponent.row-played').append(cardFrame);
    });

    //committedCard

    socket.on('opponentCommittedCard', function (data) {
        var storyId = data.storyId;
        var card = data.card;
        var cardFrame = $.renderCard(card);

        $('.opponent.row-played .card-frame[data-id=' + card.id + ']').remove();
        $('.opponent.row-committed .committed-story-' + storyId).append(cardFrame);
    });

    //endPhase

    $(document).on('click', '#end-phase', function () {
        if ($.isAllowed('endPhase')) {
            socket.emit('endPhase');
        }
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
            content += '<hr/>';
            if (data.phase == 'refresh') {
                content += '<button id="restore-insane" type="button">RestoreInsane</button>';
                content += '<button id="refresh-all" type="button">RefreshAll</button>';
            } else if (data.phase == 'operations') {
                content += '<button id="end-phase" type="button">EndPhase</button>';
            }
        }

        $('.control').html(content);

        gameInfo = data;
    });
});

var gameInfo;
