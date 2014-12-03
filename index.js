var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    util = require('util'),
    redis = require('redis'),
    chatService = require('./chat'),
    socket_io_redis  = require('socket.io-redis'),
    pub = redis.createClient(),
    sub = redis.createClient(),
    client = redis.createClient(),
    msg_count = 0,
    sockets = {};

io.adapter(socket_io_redis({
    pubClient: pub,
    subClient: sub
}));

chatService.initialize({
    'redisClient' : client,
    'redisPubClient' : pub
});


app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile('index.html', { root: __dirname });
});

app.get('/js/jquery.min.js', function(req, res){
    res.sendFile('node_modules/jquery/dist/jquery.min.js', { root: __dirname });
});

app.get('/js/jquery.min.map', function(req, res){
    res.sendFile('node_modules/jquery/dist/jquery.min.map', { root: __dirname });
});

io.on('connection', function(socket) {
    socket.broadcast.emit('hi');
    sockets[socket.id] = socket;

    console.log('user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
        chatService.removeUser(socket.id);
    });

    socket.on('chat message', function(msg){
        pub.publish("main_chat", JSON.stringify({"socket": socket.id, "message": msg}));
    });

    socket.on('user_create', function(username){
        chatService.checkAndCreateUser(username, socket.id, function(error, status){
            socket.emit('user_create',{status: status, name: username});
        });
    });
});


sub.on("error", function (err) {
    console.log("Error " + err);
});

client.on("error", function (err) {
    console.log("Error " + err);
});

pub.on("error", function (err) {
    console.log("Error " + err);
});

// redis subscribe
sub.subscribe("main_chat");
sub.on("message", function (channel, data) {
    var data = JSON.parse(data);
    var name = data.name || "";
    if (sockets[data.socket]) {
        sockets[data.socket].broadcast.emit('chat message', name + " => " + data.message);
    } else {
        io.emit('chat message', name + " => " + data.message);
    }
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});
