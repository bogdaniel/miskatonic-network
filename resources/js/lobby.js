$(function () {
    "use strict";

    function renderGameItem(game) {
        var oldContainer = $('div.game[data-id="' + game.id + '"]');

        if (game.players.length === 0 && oldContainer.length) {
            oldContainer.remove();

            return;
        }

        var container = $('<div>').addClass('game').attr('data-id', game.id);
        var title = $('<div>').addClass('title').text(game.title);
        var players = $('<div>').addClass('players');
        var player1 = $('<div>').addClass('player-1');
        var player2 = $('<div>').addClass('player-2');
        var join = $('<div>').append($('<button>').attr('id', 'join-game').text('Join'));

        if (game.players[0]) {
            player1.text(game.players[0].username);
            $('#player-1').text(game.players[0].username);
        } else {
            $('#player-1').text('');
        }

        if (game.players[1]) {
            player2.text(game.players[1].username);
            $('#player-2').text(game.players[1].username);
        } else {
            $('#player-2').text('');
        }

        if (game.players[0].id == userId || game.players.length == 2) {
            join.hide();
        }

        players.append(player1);
        players.append(player2);
        container.append(title);
        container.append(players);
        container.append(join);
        container.append($('<hr>'));

        if (oldContainer.length) {
            oldContainer.replaceWith(container);
        } else {
            $('#game-list').prepend(container);
        }
    }

    $(document).on('click', '#create-game', function () {
        socket.emit('onCreateGame', {
            title: $('#game-title').val(),
            allow_spectators: $('#allow_spectators').val()
        });

        $('#panel-create-game').hide();
        $('#panel-start-game').show();
    });

    socket.on('afterCreateGame', function (data) {
        var game = data.game;

        renderGameItem(game);
    });

    $(document).on('click', '#leave-game', function () {
        socket.emit('onLeaveGame');

        $('#panel-create-game').show();
        $('#panel-start-game').hide();
    });

    socket.on('afterLeaveGame', function (data) {
        var game = data.game;

        renderGameItem(game);
    });

    $(document).on('click', '#join-game', function () {
        socket.emit('onJoinGame', {
            id: $(this).closest('div.game').data('id')
        });

        $('#panel-create-game').hide();
        $('#panel-start-game').show();
    });

    socket.on('afterJoinGame', function (data) {
        var game = data.game;

        renderGameItem(game);
    });

    $(document).on('click', '#start-game', function () {
        socket.emit('onStartGame');
    });

    socket.on('afterStartGame', function (data) {
        var game = data.game;
        var container = $('div.game[data-id="' + game.id + '"]');

        container.remove();

        if (game.players[0].id == userId || game.players[1].id == userId) {
            window.location = '/play';
        }
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

        if (data.userId == userId) {
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
