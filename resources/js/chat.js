$(function () {
    "use strict";

    var parsedUrl = parseUri(window.location.href);
    var room = 'general';

    if (parsedUrl.query) {
        room = parsedUrl.query;
    }

    if (parsedUrl.path == '/') {
        socket.emit('join', room);
    }

    $('form.chat').submit(function (e) {
        e.preventDefault();

        socket.emit('message', $('#m').val());
        $('#m').val('');
    });

    socket.on('users', function (users) {
        $('.chat-users').empty();
        $.each(users, function (key, user) {
            $('.chat-users').prepend($('<div>').text(user.username));
        });
    });

    socket.on('messages', function (messages) {
        var container = $('.chat-messages');
        container.empty();
        $.each(messages, function (key, message) {
            container.append($('<div>').text(message.username + ', ' + message.created_at + ', ' + message.message));
        });
        container.scrollTop(container[0].scrollHeight);
    });

    socket.on('message', function (message) {
        var container = $('.chat-messages');
        container.append($('<div>').text(message.username + ', ' + message.created_at + ', ' + message.message));
        container.scrollTop(container[0].scrollHeight);
    });

    $('a.channel').on('click', function (e) {
        e.preventDefault();

        var room = $(this).attr('href').substring(1);
        window.history.replaceState(null, null, '?' + room);

        $('a.channel').removeClass('active');
        $(this).addClass('active');

        socket.emit('join', room);
    });
});
