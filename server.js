var express = require('express');
var app = express();
var nunjucks = require('nunjucks');
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('web'));

nunjucks.configure('views', {
    express: app
});

app.get('/', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

app.get('/cards', function (req, res) {
    res.render('index.html', {
        url: req.url
    });
});

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});

http.listen(3000, function () {
    console.log('listening on *:3000');
});