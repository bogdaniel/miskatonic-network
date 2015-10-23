"use strict";

var moment = require('moment');
var redis = require('../database/redis/chat');

function getUsersInRoom(socket, room) {
    var users = [];

    for (var socketId in socket.server.nsps['/'].adapter.rooms[room]) {
        var userObj = socket.server.sockets.connected[socketId];

        users.push({
            username: userObj.username
        });
    }

    return users;
}

exports.join = function (socket, room) {
    this.leave(socket);

    socket.join(room);
    socket.room = room;

    var users = getUsersInRoom(socket, room);

    socket.server.to(room).emit('users', users);

    redis.all(room).then(function (messages) {
        socket.emit('messages', messages);
    });
};

exports.message = function (socket, message) {
    message = message.trim();

    if (!message) {
        return;
    }

    message = {
        username: socket.username,
        message: message,
        created_at: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    socket.server.to(socket.room).emit('message', message);

    redis.save(socket.room, message);
};

exports.leave = function (socket) {
    var room = socket.room;

    socket.leave(room);
    socket.room = null;

    var users = getUsersInRoom(socket, room);

    socket.server.to(room).emit('users', users);
};
