$(function () {
    "use strict";

    function joinRoom(username, room) {
        socket.emit('join', {
            username: username,
            room: room
        });
    }

    var parsedUrl = parseUri(window.location.href);
    var room = 'general';

    if (parsedUrl.query) {
        room = parsedUrl.query;
    }

    if (parsedUrl.path == '/') {
        joinRoom(username, room);
    }

    $('form.chat').submit(function (e) {
        e.preventDefault();

        socket.emit('chatMessage', $('#m').val());
        $('#m').val('');
    });

    socket.on('userList', function (users) {
        $('.chat-users').empty();
        $.each(users, function (key, user) {
            $('.chat-users').prepend($('<div>').text(user.username));
        });
    });

    socket.on('archiveMessages', function (messages) {
        var container = $('.chat-messages');
        container.empty();
        $.each(messages, function (key, message) {
            message = $.parseJSON(message);
            container.append($('<div>').text(message.username + ', ' + message.created_at + ', ' + message.message));
        });
        container.scrollTop(container[0].scrollHeight);
    });

    socket.on('chatMessage', function (message) {
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

        joinRoom(username, room);
    });
});
