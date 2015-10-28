$(function () {
    "use strict";

    $.renderCard = function (card) {
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);
        var cardFrame = $('<div>').addClass('card-frame').addClass('card-' + card.status).attr('data-id', card.id);

        if (card.type != 'Story') {
            cardFrame.attr('data-cost', card.cost)
                .attr('data-faction', card.faction);
        }

        cardFrame.append(cardImage);

        return cardFrame;
    };

    $.resourceCard = function (owner, domain, card) {
        var domainContainer = $('.' + owner + '.row-domain .domain-' + domain.id);
        var resources = domainContainer.data('resources') || {};
        var cardFrame = $.renderCard(card);

        if (domain.status == 'drained') {
            $.drainDomain(owner, domain.id);
        }

        if (resources[card.faction]) {
            resources[card.faction] += 1;
        } else {
            resources[card.faction] = 1;
        }

        domainContainer.data('resources', resources);
        domainContainer.addClass('domain-' + domain.status);
        domainContainer.prepend(cardFrame);

        //TODO
        //display domain resource marker
    };

    $.playerResourceCard = function (event, ui) {
        var card = ui.draggable;
        var domain = $(event.target);
        var domainId = domain.data('id');

        domain.find('.card-highlight').remove();

        if (!$.isAllowed('resourceCard')) {
            return false;
        }

        if (gameInfo.phase == 'setup' && domain.children('.card-resource').length == 1) {
            return false;
        }

        var resources = domain.data('resources') || {};
        if (resources[card.data('faction')]) {
            resources[card.data('faction')] += 1;
        } else {
            resources[card.data('faction')] = 1;
        }
        domain.data('resources', resources);

        //TODO
        //display domain resource marker

        card.removeClass('card-active').addClass('card-resource');
        card.clone().removeAttr('style').prependTo(domain);
        card.remove();

        socket.emit('resourceCard', {
            domainId: domainId,
            cardId: card.data('id')
        });
    };

    $.playCard = function (event, ui) {
        var domain = $('.domain.target');
        var domainId = domain.data('id');
        var card = ui.draggable;
        var target = $(event.target);

        target.find('.card-highlight').remove();

        //TODO
        //card cost check

        if (!$.isAllowed('playCard') || !domain.length) {
            return false;
        }

        $.drainDomain('player', domainId);

        card.clone().attr('style', '').prependTo(target);
        card.remove();

        socket.emit('playCard', {
            cardId: card.data('id'),
            domainId: domainId
        });
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

    $.isAllowed = function (action) {
        if ($.inArray(action, gameInfo.actions) != -1 && (gameInfo.activePlayer == userId || gameInfo.activePlayer === 0)) {
            return true;
        }

        return false;
    };

    $.refreshDomain = function (owner, domainId) {
        var domainContainer;

        if (domainId === 0) {
            domainContainer = $('.' + owner + '.row-domain .domain');
        } else {
            domainContainer = $('.' + owner + '.row-domain .domain-' + domainId);
        }

        domainContainer.find('.icon').remove();
    };

    $.drainDomain = function (owner, domainId) {
        var domainContainer = $('.' + owner + '.row-domain .domain-' + domainId);
        var iconDrained = $('<div>').addClass('icon icon-drained').append($('<img>').attr('src', '/images/drained.jpg'));

        domainContainer.removeClass('target').removeClass('domain-active').addClass('domain-drained');
        domainContainer.find('.icon').remove();
        domainContainer.append(iconDrained);
    };
});
