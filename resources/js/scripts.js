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

    var fadeHighlight;
    $(document).on('mouseenter', '.card-active .card-frame, .card-exhausted .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        clearTimeout(fadeHighlight);
        var src = $(this).find('img').attr('src');
        var img = $('<img>').addClass('img-responsive').attr('src', src);
        $('.highlight').html(img);
    }).on('mouseout', '.card-active .card-frame, .card-exhausted .card-frame, .card-story .card-frame, .card-resources .card-frame, .card-attachments .card-frame', function () {
        fadeHighlight = setTimeout(function () {
            $('.highlight img').fadeOut(400, function () {
                $('.highlight').empty();
            });
        }, 10000);
    }).on('dblclick', '.card-active, .card-exhausted, .card-story, .card-resource', function (e) {
        fancyBox(e);
    }).on('click', '.highlight', function (e) {
        fancyBox(e);
    });
});
