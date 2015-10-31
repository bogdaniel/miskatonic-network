$(function () {
    "use strict";

    $.droppableOver = function (event, ui) {
        var target = $(event.target);
        var item = ui.draggable;
        var card = item.children('.card-frame');
        var highlight = $('<div>').addClass('card-frame').addClass('card-highlight');

        if (target.hasClass('card-wrapper') || $.inArray('attachment', card.data('subtype')) !== -1) {
            return false;
        }

        $(this).prepend(highlight);
    };

    $.droppableOut = function (event, ui) {
        $(event.target).find('.card-highlight').remove();
    };

    $.fn.setDimensions = function () {
        var self = $(this);
        var attachedCount = self.find('> .card-attachments > .card-frame').length;

        if (self.closest('[data-section]').hasClass('row-committed') && self.hasClass('card-exhausted')) {
            var width = 70 + attachedCount * 10;
            var marginTop = -10 + attachedCount * 5;
            var marginBottom = -15 + attachedCount * 5;

            self.css('width', width + 'px');
            self.css('margin-top', marginTop + 'px');
            self.css('margin-bottom', marginBottom + 'px');
        }

        return self;
    };

    $.fn.setAttachable = function () {
        var self = $(this);

        return self.droppable({
            greedy: true,
            accept: '.row-hand .card-wrapper',
            drop: $.attachCard,
            over: function (event, ui) {
                var highlight = $('<div>').addClass('card-frame').addClass('card-highlight');
                var attachableWrapper = $(event.target);
                var attachable = attachableWrapper.children('.card-frame');
                var attachmentWrapper = ui.draggable;
                var attachment = attachmentWrapper.children('.card-frame');

                if (attachment.data('attachable') != attachable.data('type') || !attachableWrapper.hasClass('card-wrapper')) {
                    return false;
                }

                var attachments = attachableWrapper.children('.card-attachments');
                if (!attachments.length) {
                    attachments = $('<div>').addClass('card-attachments').prependTo(attachableWrapper);
                }

                attachments.prepend(highlight);
            },
            out: $.droppableOut
        });
    };

    $.fn.setSortable = function () {
        return $(this).sortable({
            items: '> div',
            handle: 'img',
            placeholder: 'card-wrapper card-highlight',
            scroll: false
        });
    };

    $.fn.setDroppable = function () {
        var self = $(this);
        var accept;
        var drop;

        if (self.hasClass('player') && self.hasClass('row-played')) {
            accept = '.row-hand .card-wrapper';
            drop = $.playCard;
        }

        return self.droppable({
            greedy: true,
            accept: accept,
            drop: drop,
            over: $.droppableOver,
            out: $.droppableOut
        });
    };
});
