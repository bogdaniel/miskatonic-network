$(function () {
    "use strict";

    $.domainResourceCount = function (resources) {
        var count = 0;

        for (var resource in resources) {
            if (resources.hasOwnProperty(resource)) {
                count += parseInt(resources[resource]);
            }
        }

        return count;
    };

    $.renderCard = function (card) {
        var image = card.image;

        if (card.status == 'insane') {
            image = 'back/card-back.jpg';
        }

        var cardWrapper = $('<div>').addClass('card-wrapper').addClass('card-' + card.status);
        //var cardAttachments = $('<div>').addClass('card-attachments');
        var cardFrame = $('<div>').addClass('card-frame').attr('data-id', card.id).data('image', card.image);
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + image);

        if (card.type != 'Story') {
            cardFrame.attr('data-cost', card.cost)
                .attr('data-faction', card.faction);
        }

        cardFrame.append(cardImage);
        //cardWrapper.append(cardAttachments);
        cardWrapper.append(cardFrame);

        return cardWrapper;
    };

    $.renderAttachedCard = function (owner, hostId, card) {
        var cardFrame = $('<div>').addClass('card-frame').attr('data-id', card.id).data('image', card.image);
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + card.image);

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
    };

    $.playerResourceCard = function (event, ui) {
        var cardWrapper = ui.draggable;
        var card = cardWrapper.children('.card-frame');
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

        cardWrapper.removeClass('card-active').addClass('card-resource');
        cardWrapper.clone().removeAttr('style').prependTo(domain);
        cardWrapper.remove();

        socket.emit('resourceCard', {
            domainId: domainId,
            cardId: card.data('id')
        });
    };

    $.playCard = function (event, ui) {
        var domain = $('.domain.target');
        var domainId = domain.data('id');
        var cardWrapper = ui.draggable;
        var card = cardWrapper.children('.card-frame');
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('playCard') || !domain.length) {
            return false;
        }

        var cardCost = card.data('cost');
        var cardFaction = card.data('faction');
        var resources = domain.data('resources');

        if (!(resources[cardFaction] && $.domainResourceCount(resources) >= cardCost)) {
            return false;
        }

        $.drainDomain('player', domainId);

        cardWrapper.clone().removeAttr('style').prependTo(target);
        cardWrapper.remove();

        socket.emit('playCard', {
            cardId: card.data('id'),
            domainId: domainId
        });
    };

    $.commitCard = function (event, ui) {
        var cardWrapper = ui.draggable;
        var card = cardWrapper.children('.card-frame');
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('commitCard') || !cardWrapper.hasClass('card-active')) {
            return false;
        }

        cardWrapper.removeClass('card-active').addClass('card-exhausted');
        cardWrapper.clone().removeAttr('style').prependTo(target);
        cardWrapper.remove();

        socket.emit('commitCard', {
            storyId: target.data('id'),
            cardId: card.data('id')
        });
    };

    $.uncommitAll = function () {
        $('.player.row-committed .col-committed .card-wrapper').each(function () {
            $.uncommitCard('player', $(this));
        });

        $('.opponent.row-committed .col-committed .card-wrapper').each(function () {
            $.uncommitCard('opponent', $(this));
        });
    };

    $.uncommitCard = function (owner, card) {
        card.appendTo('.' + owner + '.row-played');
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

        domainContainer.removeClass('domain-drained').addClass('domain-active');
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
