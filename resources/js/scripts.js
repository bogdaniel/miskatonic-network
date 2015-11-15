$(function () {
    "use strict";

    function fancyBox(e) {
        $.fancybox({
            href: $(e.target).attr('src'),
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
            }
        });
    }

    $(document).on('mouseenter', '.card-active .card-frame, .card-exhausted .card-frame, .card-insane .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        var img = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + $(this).data('image'));
        $('.highlight').html(img);
    }).on('mouseleave', '.card-active .card-frame, .card-exhausted .card-frame, .card-insane .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        $('.highlight').empty();
    }).on('dblclick', '.card-active, .card-exhausted, .card-story, .card-resource', function (e) {
        fancyBox(e);
    }).on('click', '.highlight', function (e) {
        fancyBox(e);
    });
});
