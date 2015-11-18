$(function () {
    "use strict";

    $('.gameboard').disableSelection();

    $(document).on('click', '.leave-game', function () {
        socket.emit('leave');
    });

    $(document).on('click', '.card-active .discard-pile', function () {
        var images = [];

        $.each($(this).data('images').reverse(), function (index, image) {
            images.push({href: '/images/cards/' + image});
        });

        fancybox($(this).children('img'), images);
    });

    //drawnCard

    $(document).on('click', '.row-player .draw-deck', function () {
        if ($.isAllowed('drawCard')) {
            socket.emit('drawCard');
        }
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

    //restoreInsane

    $(document).on('click', '.player.row-played .card-insane', function () {
        if (!$.isAllowed('restoreInsane')) {
            return false;
        }

        var card = $(this).children('.card-frame');

        if (card.hasClass('target')) {
            card.removeClass('target');
            card.find('.icon-target').remove();
        } else {
            var cards = $('.player.row-played .card-insane .card-frame');
            var iconTarget = $('<div>').addClass('icon icon-target').append($('<img>').attr('src', '/images/target.jpg'));

            cards.removeClass('target');
            cards.find('.icon-target').remove();
            card.addClass('target');
            card.append(iconTarget);
        }
    });

    $(document).on('click', '#restore-insane', function () {
        var card = $('.player.row-played .card-insane .card-frame.target');

        if (!$.isAllowed('restoreInsane') || !card.length) {
            return false;
        }

        socket.emit('restoreInsane', {
            cardId: card.data('id')
        });
    });

    $(document).on('click', '#refresh-all', function () {
        if ($.isAllowed('refreshAll')) {
            socket.emit('refreshAll');
        }
    });

    //noAction

    $(document).on('click', '#no-action', function () {
        if (!$.isAllowed('noAction')) {
            return false;
        }

        if (gameInfo.phase == 'operations') {
            //TODO
            //remove all target icons

            $('.player.row-domain .domain.target .icon-target').remove();
            $('.player.row-domain .domain.target').removeClass('target');
        }

        socket.emit('noAction');
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

        var storyCardId = $('.row-story .card-story .target').data('id');

        if ($(this).closest('.committed-story-' + storyCardId).length === 0) {
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

    $(document).on('click', '#determine-success', function () {
        if (!$.isAllowed('determineSuccess')) {
            return false;
        }

        //TODO
        //remove target icon from story card

        socket.emit('determineSuccess');
    });

    $(document).on('click', '#end-turn', function () {
        if (!$.isAllowed('endTurn')) {
            return false;
        }

        socket.emit('endTurn');
    });
});
