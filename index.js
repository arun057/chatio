var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    util = require('util'),
    redis = require('redis'),
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

// user management
var UserStore = function() {
    var user_store = 'user_store',
        username_store = 'user_names';

    function checkUser(username, callback) {
        client.hexists(username_store, username, callback);
    }

    function checkAndCreateUser(username, socket, callback) {
        checkUser(username, function(error, exists) {
            if(exists) {
                callback(error, false);
            } else {
                client.hset(username_store, username, socket);
                client.hset(user_store, socket.id, JSON.stringify({name: username}));
                sockets[socket.id] = socket;
                callback(error, true);
            }
        });
    }

    function removeUser(socket_id, callback) {
        client.hdel(user_store, socket_id);
    }

    return {
        checkUser: checkUser,
        checkAndCreateUser: checkAndCreateUser,
        removeUser: removeUser
    };
}();


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
        UserStore.removeUser(socket.id);
    });

    socket.on('chat message', function(msg){
        pub.publish("main_chat", JSON.stringify({"socket": socket.id, "message": msg}));
    });
});


sub.on("error", function (err) {
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
