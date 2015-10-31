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
        var cardFrame = $('<div>').addClass('card-frame').attr('data-id', card.id).data('image', card.image)
            .data('type', card.type).data('subtype', card.subtype);
        var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + image);

        if (card.type != 'Story') {
            cardFrame.attr('data-cost', card.cost).attr('data-faction', card.faction);
        }

        if ($.inArray('attachment', card.subtype) !== -1) {
            cardFrame.data('attachable', ['character']);
        }

        cardFrame.append(cardImage);
        cardWrapper.append(cardFrame);

        return cardWrapper;
    };

    $.renderAttachedCard = function (card) {
        var cardWrapper = $.renderCard(card);
        var cardFrame = cardWrapper.children('.card-frame');
        var attachableWrapper = $('[data-id=' + card.attachableId + ']').closest('.card-wrapper');
        var attachments = attachableWrapper.children('.card-attachments');

        if (!attachments.length) {
            attachments = $('<div>').addClass('card-attachments').prependTo(attachableWrapper);
        }

        attachments.append(cardFrame);
        attachableWrapper.setDimensions();

        return cardFrame;
    };

    $.resourceCard = function (owner, domain, card) {
        var domainContainer = $('.' + owner + '.row-domain .domain-' + domain.id);
        var resourceContainer = domainContainer.children('.card-resources');
        var resources = domainContainer.data('resources') || {};
        var cardFrame = $.renderCard(card).find('.card-frame');

        if (domain.status == 'drained') {
            $.drainDomain(owner, domain.id);
        }

        if (!resourceContainer.length) {
            resourceContainer = $('<div>').addClass('card-resources').prependTo(domainContainer);
        }

        if (resources[card.faction]) {
            resources[card.faction] += 1;
        } else {
            resources[card.faction] = 1;
        }

        resourceContainer.append(cardFrame);
        domainContainer.prepend(resourceContainer);
        domainContainer.data('resources', resources);
        domainContainer.addClass('domain-' + domain.status);
    };

    $.playerResourceCard = function (event, ui) {
        var domainContainer = $(event.target);
        var resourceContainer = domainContainer.children('.card-resources');
        var resources = domainContainer.data('resources') || {};
        var cardFrame = ui.draggable.find('.card-frame');

        domainContainer.find('.card-highlight').remove();

        if (!$.isAllowed('resourceCard')) {
            return false;
        }

        if (!resourceContainer.length) {
            resourceContainer = $('<div>').addClass('card-resources').prependTo(domainContainer);
        }

        if (gameInfo.phase == 'setup' && resourceContainer.find('.card-frame').length == 1) {
            return false;
        }

        if (resources[cardFrame.data('faction')]) {
            resources[cardFrame.data('faction')] += 1;
        } else {
            resources[cardFrame.data('faction')] = 1;
        }
        domainContainer.data('resources', resources);

        cardFrame.clone(true).off().removeAttr('style').prependTo(resourceContainer);
        ui.draggable.remove();

        socket.emit('resourceCard', {
            domainId: domainContainer.data('id'),
            cardId: cardFrame.data('id')
        });
    };

    $.playCard = function (event, ui) {
        var domain = $('.domain.target');
        var domainId = domain.data('id');
        var cardWrapper = ui.draggable;
        var card = cardWrapper.children('.card-frame');
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('playCard') || !domain.length || $.inArray('attachment', card.data('subtype')) !== -1) {
            return false;
        }

        var cardCost = card.data('cost');
        var cardFaction = card.data('faction');
        var resources = domain.data('resources');

        if (!(resources[cardFaction] && $.domainResourceCount(resources) >= cardCost)) {
            return false;
        }

        $.drainDomain('player', domainId);

        cardWrapper.clone(true).off().removeAttr('style').setAttachable().prependTo(target);
        cardWrapper.remove();

        socket.emit('playCard', {
            cardId: card.data('id'),
            domainId: domainId
        });
    };

    $.attachCard = function (event, ui) {
        var domain = $('.domain.target');
        var domainId = domain.data('id');
        var attachableWrapper = $(event.target);
        var attachable = attachableWrapper.children('.card-frame');
        var attachmentWrapper = ui.draggable;
        var attachment = attachmentWrapper.children('.card-frame');

        attachableWrapper.find('.card-highlight').remove();

        if (!$.isAllowed('playCard') || !domain.length || $.inArray('attachment', attachment.data('subtype')) == -1 || $.inArray(attachable.data('type'), attachment.data('attachable')) == -1) {
            return false;
        }

        var attachmentCost = attachment.data('cost');
        var attachmentFaction = attachment.data('faction');
        var resources = domain.data('resources');

        if (!(resources[attachmentFaction] && $.domainResourceCount(resources) >= attachmentCost)) {
            return false;
        }

        $.drainDomain('player', domainId);

        var attachments = attachableWrapper.children('.card-attachments');
        if (!attachments.length) {
            attachments = $('<div>').addClass('card-attachments').prependTo(attachableWrapper);
        }

        attachmentWrapper.clone(true).off().children('.card-frame').prependTo(attachments);
        attachmentWrapper.remove();

        attachableWrapper.setDimensions();

        socket.emit('attachCard', {
            section: attachable.closest('[data-section]').data('section'),
            sectionId: attachable.closest('[data-section]').data('id'),
            attachableId: attachable.data('id'),
            attachmentId: attachment.data('id'),
            domainId: domainId
        })
    };

    $.commitCard = function (event, ui) {
        var cardWrapper = ui.draggable;
        var card = cardWrapper.children('.card-frame');
        var target = $(event.target);

        target.find('.card-highlight').remove();

        if (!$.isAllowed('commitCard') || !cardWrapper.hasClass('card-active')) {
            return false;
        }

        cardWrapper.removeClass('card-active').addClass('card-exhausted').setDimensions();
        cardWrapper.clone(true).off().removeAttr('style').prependTo(target);
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
