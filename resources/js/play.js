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
        $.resourceCard('opponent', {
            id: data.domainId,
            status: 'active'
        }, data.card);
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
            $(this).removeClass('card-exhausted').addClass('card-active').setDimensions();
        });
    });

    socket.on('opponentRefreshedAll', function () {
        $.refreshDomain('opponent', 0);

        $('.opponent.row-played .card-exhausted').each(function () {
            $(this).removeClass('card-exhausted').addClass('card-active').setDimensions();
        });
    });

    //playedCard

    socket.on('opponentPlayedCard', function (card) {
        var cardFrame = $.renderCard(card).setAttachable();
        var handCount = $('.row-opponent .hand-deck .count');

        handCount.text(parseInt(handCount.text()) - 1);
        $('.opponent.row-played').append(cardFrame);
    });

    //attachedCard

    socket.on('opponentAttachedCard', function (card) {
        $.renderAttachedCard(card);
    });

    //committedCard

    socket.on('opponentCommittedCard', function (data) {
        var storyId = data.storyId;
        var card = data.card;
        var cardWrapper = $('.opponent.row-played > .card-wrapper > .card-frame[data-id=' + card.id + ']').closest('.card-wrapper');

        cardWrapper.removeClass('card-active').addClass('card-exhausted');
        cardWrapper.appendTo('.opponent.row-committed .committed-story-' + storyId).setDimensions();
    });

    //endPhase

    $(document).on('click', '#end-phase', function () {
        if (!$.isAllowed('endPhase')) {
            return false;
        }

        if (gameInfo.phase == 'operations') {
            $('.player.row-domain .domain.target .icon-target').remove();
            $('.player.row-domain .domain.target').removeClass('target');
        }

        if (gameInfo.phase == 'story' && gameInfo.step == 'resolveStories') {
            $.uncommitAll();
        }

        socket.emit('endPhase');
    });

    //resolveStory

    $(document).on('click', '.row-story .card-story', function () {
        if (!$.isAllowed('resolveStory')) {
            return false;
        }

        var storyCard = $(this).children('.card-frame');

        var storyId = storyCard.data('id');
        var playerCommits = $('.player.row-committed .col-committed.committed-story-' + storyId).children().length;
        var opponentCommits = $('.opponent.row-committed .col-committed.committed-story-' + storyId).children().length;

        if (!playerCommits && !opponentCommits) {
            return false;
        }

        if (storyCard.hasClass('target')) {
            storyCard.removeClass('target');
            storyCard.find('.icon-target').remove();
        } else {
            var stories = $('.row-story .card-story .card-frame');
            var iconTarget = $('<div>').addClass('icon icon-target').append($('<img>').attr('src', '/images/target.jpg'));

            stories.removeClass('target');
            stories.find('.icon-target').remove();
            storyCard.addClass('target');
            storyCard.append(iconTarget);
        }
    });

    $(document).on('click', '#resolve-story', function () {
        var story = $('.row-story .card-story .card-frame.target');

        if (!$.isAllowed('resolveStory') || !story.length) {
            return false;
        }

        socket.emit('resolveStory', {
            storyId: story.data('id')
        });
    });

    socket.on('storyResolved', function () {
        //TODO
    });

    $(document).on('click', '#resolve-struggle', function () {
        var struggle = $(this).data('type');

        if (!$.isAllowed('resolve' + struggle + 'Struggle')) {
            return false;
        }

        socket.emit('resolveIconStruggle', {
            struggle: struggle
        });
    });

    $(document).on('click', '.player.row-committed .card-exhausted', function () {
        if (!$.isAllowed('goInsane') && $.isAllowed('takeWound') && $.isAllowed('goReady')) {
            return false;
        }

        var cardFrame = $(this).children('.card-frame');

        if (cardFrame.hasClass('target')) {
            cardFrame.removeClass('target');
            cardFrame.find('.icon-target').remove();
        } else {
            var cards = $('.player.row-committed .card-exhausted .card-frame');
            var iconTarget = $('<div>').addClass('icon icon-target').append($('<img>').attr('src', '/images/target.jpg'));

            cards.removeClass('target');
            cards.find('.icon-target').remove();
            cardFrame.addClass('target');
            cardFrame.append(iconTarget);
        }
    });

    $(document).on('click', '#response-struggle', function () {
        var resolveType = $(this).data('type');
        var card = $('.player.row-committed .card-exhausted .card-frame.target');

        if ((!$.isAllowed('goInsane') && $.isAllowed('takeWound') && $.isAllowed('goReady')) || !card.length) {
            return false;
        }

        socket.emit('responseStruggle', {
            cardId: card.data('id'),
            resolveType: resolveType
        });
    });

    socket.on('iconStruggleResolved', function (data) {
        //TODO

        console.log(data);
    });

    $(document).on('click', '#determine-success', function () {
        if (!$.isAllowed('determineSuccess')) {
            return false;
        }

        //TODO
        //remove target icon from story card

        socket.emit('determineSuccess');
    });

    socket.on('successDetermined', function (data) {
        //TODO

        console.log(data);
    });

    $(document).on('click', '#end-turn', function () {
        if (!$.isAllowed('endTurn')) {
            return false;
        }

        socket.emit('endTurn');
    });

    socket.on('turnEnded', function () {
        $('.row-story .icon').remove();
        $.uncommitAll();
    });
});
