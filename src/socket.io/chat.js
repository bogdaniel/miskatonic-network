var moment = require('moment');
var redis = require('../database/redis/chat');

function getUsersInRoom(socket, room) {
    var userList = [];

    for (var socketId in socket.server.nsps['/'].adapter.rooms[room]) {
        var userObj = socket.server.sockets.connected[socketId];

        userList.push({
            username: userObj.username
        });
    }

    return userList;
}

exports.join = function (socket, room) {
    this.leave(socket);

    socket.join(room);
    socket.room = room;

    var userList = getUsersInRoom(socket, room);

    socket.server.to(room).emit('userList', userList);

    redis.all(room).then(function (messages) {
        socket.emit('archiveMessages', messages);
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

    socket.server.to(socket.room).emit('chatMessage', message);

    redis.save(socket.room, message);
};

exports.leave = function (socket) {
    var room = socket.room;

    socket.leave(room);
    socket.room = null;

    var userList = getUsersInRoom(socket, room);

    socket.server.to(room).emit('userList', userList);
};
