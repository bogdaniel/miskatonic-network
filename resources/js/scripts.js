$(function () {
    "use strict";

    var fadeHighlight;
    $(document).on('mouseenter', '.card-active, .card-exhausted, .card-story, .card-resource', function () {
        clearTimeout(fadeHighlight);
        var src = $(this).find('img').attr('src');
        var img = $('<img>').addClass('img-responsive').attr('src', src);
        $('.highlight').html(img);
    }).on('mouseout', '.card-active, .card-exhausted, .card-story, .card-resource', function () {
        fadeHighlight = setTimeout(function () {
            $('.highlight img').fadeOut(400, function () {
                $('.highlight').empty();
            });
        }, 10000);
    });

    $(document).on('click', '.highlight img', function () {
        var src = $(this).attr('src');
        console.log(src);
    });
});
