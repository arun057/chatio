var net = require('net'),
    util = require('util'),
    redis = require('redis'),
    pub = redis.createClient(),
    sub = redis.createClient(),
    client = redis.createClient(),
    chatService = require('./chat'),
    sockets = [],
    chat = {
        rooms: {},
        users: {}
    };

chatService.initialize({
    'redisClient' : client,
    'redisPubClient' : pub
});

sub.on("error", function (err) {
    console.log("Error " + err);
});

pub.on("error", function (err) {
    console.log("Error " + err);
});

// redis subscribe
sub.subscribe("main_chat");

var clients = [];
var commands = {
    '@quit' : function(data, socket) {
        socket.end('Goodbye!\n');
    },
    '@help' : function(data, socket) {
        printHelp(socket);
    },
    '@name' : function(data, socket) {
        var id = socket._handle.fd;
        chatService.getUser(id, function(error, user){
            user = JSON.parse(user);
            socket.write('Your name is : ' + user["name"] + '\n');
        });
    },
    '@total' : function(data, socket) {
        socket.write(sockets.length + " \n");
        socket.write(Object.keys(chat.users).length + "\n");
    },
    '/join' : function(data, socket) {
        var id = socket._handle.fd;
        var roomname = data.split(" ")[1];
        chatService.joinRoom(id, roomname, function(error, status){
            if ( !status ) {
                socket.write("Room not found. \n");
            } else {
                chat.users[id]["room"] = roomname;
                socket.write("Joined " + roomname + "\n");
            }
        });
    },
    '/rooms' : function(data, socket) {
        chatService.getRooms(function(error, rooms){
            if (rooms && Object.keys(rooms).length > 0) {
                for (var room in rooms) {
                    var users = JSON.parse(rooms[room]);
                    socket.write(" *  " + room + " (" + users.length + ") \n");
                }
                socket.write("/join <roomname> to join room. \n");
            } else {
                socket.write("No rooms created yet. /newroom <roomname> to create room. \n");
            }
        });
    },
    '/newroom' : function(data, socket) {
        var id = socket._handle.fd;
        var roomname = data.split(" ")[1];
        chatService.createOrJoinRoom(id, roomname, function(error, message){
            socket.write(message);
        });
    },
    '@reset' : function(data, socket) {
        chatService.resetData();
        socket.write('Reset complete');
    }
};

function receiveData(data, socket) {
    var id = socket._handle.fd;
    var cleanData = stripData(data);
    if(typeof(commands[cleanData.split(" ")[0]]) !== "undefined" ) {
        commands[cleanData.split(" ")[0]](cleanData,socket);
    } else if(chat.users[id].name === undefined) {
        checkName(cleanData, socket);
    } else {
        cleanData = cleanData + "\n";
        chatService.sendMessage(id, cleanData);
    }
}

sub.on("message", function (channel, data) {
    var data = JSON.parse(data);
    var name = data.name || "";
    var user_id = data.socket || "";
    var user_sockets = JSON.parse(data.sockets);
    for (var key in user_sockets) {
        if (chat.users[user_sockets[key]] && user_sockets[key] != user_id) {
            chat.users[user_sockets[key]].socket.write("<" + name + "> " + data.message);
        }
    }
});


function checkName(name, socket) {
    var id = socket._handle.fd;
    chatService.checkAndCreateUser(name, id, function(error, status){
        if (!status) {
            socket.write('Sorry, name taken.\nLogin Name? ');
        } else {
            socket.write('Welcome ' + name + ' \n');
            chat.users[id].name = name;
        }
    });
}

function printHelp(socket) {
    socket.write(
        "@name - retrieve your login name. \n" +
        "/join < room name > - join room. \n" +
        "/rooms - Lists all rooms. \n" +
        "/newroom < room name > - Create a room. \n" +
        "@quit - Quit chat. \n"
    );
}

function newSocket (socket) {
    // console.log(util.inspect(socket));
    var id = socket._handle.fd;
    sockets.push(socket);
    chat.users[id] = {name: undefined, socket: socket};
    socket.write('Welcome to the Telnet Server!\n');
    printHelp(socket);
    socket.write('Login Name?  ');
    socket.on('data', function(data) {
        receiveData(data, socket);
    }).on('end', function() {
        chatService.removeUser(id, function(error, status){
            closeSocket(socket);
            console.log("User disconnected: " + chat.users[id].name);
        });
    });
}

function closeSocket(socket) {
    var i = sockets.indexOf(socket);
    if (i != -1) {
        sockets.splice(i, 1);
    }
}

function stripData(data) {
    return data.toString().replace(/(\r\n|\n|\r)/gm,"");
}

var server = net.createServer(newSocket);

server.listen(9399);
console.log('Server started at localhost:9399');
