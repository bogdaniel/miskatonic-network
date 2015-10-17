$(function () {
    var fadeHighlight;
    $(document).on('mouseenter', '.card, .card-exhausted, .card-story, .card-resource', function () {
        clearTimeout(fadeHighlight);
        var src = $(this).find('img').attr('src');
        var img = $('<img>').addClass('img-responsive').attr('src', src);
        $('.highlight').html(img);
    }).on('mouseout', '.card, .card-exhausted, .card-story, .card-resource', function () {
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