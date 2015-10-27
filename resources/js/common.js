$(function () {
    "use strict";

    $.renderCard = function (card) {
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
        var cardFrame = $('<div>').addClass('card-frame').addClass('card-' + card.status).attr('data-id', card.cid);
        cardFrame.append(cardImage);

        return cardFrame;
    };

    $.playCard = function (event, ui) {
        var card = ui.draggable;
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('playCard')) {
            return false;
        }

        card.clone().attr('style', '').prependTo(target);
        card.remove();

        socket.emit('playCard', card.data('id'));
    };

    $.commitCard = function (event, ui) {
        var card = ui.draggable;
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('commitCard')) {
            return false;
        }

        card.removeClass('card-active').addClass('card-exhausted');
        card.clone().attr('style', '').prependTo(target);
        card.remove();

        socket.emit('commitCard', {
            storyId: $(event.target).data('id'),
            cardId: card.data('id')
        });
    };

    $.resourceCard = function (event, ui) {
        var resourceId = $(event.target).data('id');
        var card = ui.draggable;
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('resourceCard')) {
            return false;
        }

        if (gameInfo.phase == 'setup' && target.children('.card-resource').length == 1) {
            return false;
        }

        card.removeClass('card-active').addClass('card-resource');
        card.clone().attr('style', '').prependTo(target);
        card.remove();

        socket.emit('resourceCard', {
            resourceId: resourceId,
            cardId: card.data('id')
        });
    };

    $.droppableOver = function (event, ui) {
        var highlight = $('<div>').addClass('card-highlight');
        $(this).prepend(highlight);
    };

    $.droppableOut = function (event, ui) {
        $(this).find('.card-highlight').remove();
    };

    $.setSortable = function (element) {
        $(element).sortable({
            items: '> div',
            handle: 'img',
            placeholder: 'card-highlight',
            scroll: false
        }).disableSelection();
    };

    $.player = function (game) {
        var p = false;

        $.each(game.players, function (index, player) {
            if (player.id === userId) {
                p = player;
            }
        });

        return p;
    };

    $.opponent = function (game) {
        var p = false;

        $.each(game.players, function (index, player) {
            if (player.id !== userId) {
                p = player;
            }
        });

        return p;
    };

    $.isAllowed = function (action) {
        if ($.inArray(action, gameInfo.actions) != -1 && (gameInfo.activePlayer == userId || gameInfo.activePlayer === 0)) {
            return true;
        }

        return false;
    };
});
