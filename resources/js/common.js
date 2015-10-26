$(function () {
    "use strict";

    $.renderCard = function (card) {
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
        var cardFrame = $('<div>').addClass('card-frame').addClass('card-' + card.status).attr('data-id', card.cid);
        cardFrame.append(cardImage);

        return cardFrame;
    };

    $.playCardfromHand = function (event, ui) {
        var card = ui.item;

        socket.emit('playCard', card.data('id'));
    };

    $.commitCard = function (event, ui) {
        var card = ui.item;

        card.removeClass('card-active').addClass('card-exhausted');

        socket.emit('commitCard', {
            storyId: $(event.target).data('id'),
            cardId: card.data('id')
        });
    };

    $.resourceCard = function (event, ui) {
        var resourceId = $(event.target).data('id');
        var card = ui.draggable;

        $(event.target).find('.card-highlight').remove();
        card.removeClass('card-active').addClass('card-resource');
        card.clone().attr('style', '').prependTo('.player.row-domain .domain-' + resourceId);
        card.remove();

        socket.emit('resourceCard', {
            resourceId: resourceId,
            cardId: card.data('id')
        });
    };

    $.setSortable = function (element, connection, handler) {
        $(element).sortable({
            items: '> div',
            handle: 'img',
            connectWith: connection,
            placeholder: 'card-highlight',
            scroll: false,
            receive: handler
        }).disableSelection();
    };
});
