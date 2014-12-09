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

// chatService.resetData();

app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
  res.sendFile('index.html', { root: __dirname });
});

app.get('/rooms', function(req, res){
    chatService.getRooms(function(error, data){
        res.json(data);
    });
});

app.get('/reset', function(req, res){
    chatService.resetData();
    res.json("true");
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

    socket.on('disconnect', function(){
        chatService.removeUser(socket.id);
    });

    socket.on('chat message', function(msg){
        chatService.sendMessage(socket.id, msg);
    });

    socket.on('user_create', function(username){
        chatService.checkAndCreateUser(username, socket.id, function(error, status){
            socket.emit('user_create',{status: status, name: username});
        });
    });

    socket.on('create_room', function(room) {
        chatService.createOrJoinRoom(socket.id, room, function(error, message) {
            socket.emit('create_room', message);
        });
    });

    socket.on('join_room', function(room){
        chatService.joinRoom(socket.id, room, function(error, status) {
            socket.emit('join_room',room);
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
    var user_id = data.socket || "";
    data.sockets = data.sockets || "[]";
    var user_sockets = JSON.parse(data.sockets);
    for (var key in user_sockets) {
        if (sockets[user_sockets[key]] && user_sockets[key] != user_id) {
            sockets[user_sockets[key]].emit('chat message', name + ": " + data.message);
        }
    }
});


http.listen(8080, function(){
  console.log('listening on *:8080');
});
