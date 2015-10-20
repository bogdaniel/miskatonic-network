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

    $(document).on('click', '.row-player .draw-deck', function () {
        socket.emit('onCardDraw', {
            amount: 1
        });
    });

    socket.on('afterCardDraw', function (data) {
        var drawDeckCounter;
        var drawDeck;
        var handDeckCounter;
        var handDeck;

        if (data.userid == userid) {
            drawDeckCounter = $('.row-player .draw-deck .counter');
            drawDeck = parseInt(drawDeckCounter.text()) - 1;
            drawDeckCounter.text(drawDeck);

            var cardImage = $('<img>').addClass('img-responsive').attr('src', '/images/cards/' + data.card.image);
            var cardFrame = $('<div>').addClass('card-frame card-active');
            cardFrame.append(cardImage);

            $('.row-hand').append(cardFrame);
        } else {
            drawDeckCounter = $('.row-enemy .draw-deck .counter');
            handDeckCounter = $('.row-enemy .hand-deck .counter');
            drawDeck = parseInt(drawDeckCounter.text()) - 1;
            handDeck = parseInt(handDeckCounter.text()) + 1;
            drawDeckCounter.text(drawDeck);
            handDeckCounter.text(handDeck);
        }
    });
});
