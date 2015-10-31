$(function () {
    "use strict";

    $.droppableOver = function (event, ui) {
        var target = $(event.target);
        var item = ui.draggable;
        var card = item.children('.card-frame');

        if (target.hasClass('card-wrapper') || $.inArray('attachment', card.data('subtype')) !== -1) {
            return false;
        }

        var highlight = $('<div>').addClass('card-wrapper').addClass('card-highlight');
        $(this).prepend(highlight);
    };

    $.droppableOut = function (event, ui) {
        $(this).find('.card-highlight').remove();
    };

    $.fn.setDimensions = function () {
        var self = $(this);
        var attachedCount = self.find('.card-attachments > .card-frame').length;

        return self;
    };

    $.fn.setAttachable = function () {
        var self = $(this);

        return self.droppable({
            greedy: true,
            accept: '.row-hand .card-wrapper',
            drop: $.attachCard,
            over: function (event, ui) {
                var highlight = $('<div>').addClass('card-wrapper').addClass('card-highlight');
                var attachableWrapper = $(event.target);
                var attachable = attachableWrapper.children('.card-frame');
                var attachmentWrapper = ui.draggable;
                var attachment = attachmentWrapper.children('.card-frame');

                if (attachment.data('attachable') != attachable.data('type') || !attachableWrapper.hasClass('card-wrapper')) {
                    return false;
                }

                $(this).prepend(highlight);
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
