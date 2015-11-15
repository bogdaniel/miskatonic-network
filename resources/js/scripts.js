$(function () {
    "use strict";

    $(document).on('mouseenter', '.card-active .card-frame, .card-exhausted .card-frame, .card-insane .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        var img = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + $(this).data('image'));
        $('.highlight').html(img);
    }).on('mouseleave', '.card-active .card-frame, .card-exhausted .card-frame, .card-insane .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        $('.highlight').empty();
    }).on('dblclick', '.card-active, .card-exhausted, .card-story, .card-resources', function (e) {
        fancybox($(e.target));
    });
});

function fancybox(element, items, options) {
    items = items || [];

    if (!items.length) {
        items.push({
            href: element.attr('src')
        });
    }

    $.fancybox.open(items, $.extend({}, {
        scrolling: 'no',
        closeClick: true,
        closeBtn: false,
        type: 'image',
        openEffect: 'none',
        closeEffect: 'none',
        nextEffect: 'none',
        prevEffect: 'none',
        openSpeed: 1,
        closeSpeed: 1,
        nextSpeed: 1,
        prevSpeed: 1,
        openEasing: 'none',
        closeEasing: 'none',
        nextEasing: 'none',
        prevEasing: 'none',
        openOpacity: false,
        closeOpacity: false,
        helpers: {
            overlay: {
                locked: false
            }
        },
        padding: 0
    }, options));
}
