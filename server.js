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
        //
    },
    '@name' : function(data, socket) {
        var id = socket._handle.fd;
        socket.write('Your name is : ' + chat.users[id].name + '\n');
    },
    '@total' : function(data, socket) {
        socket.write(sockets.length + " \n");
        socket.write(Object.keys(chat.users).length + "\n");
    },
    '/join' : function(data, socket) {
        var id = socket._handle.fd;
        var roomname = data.split(" ")[1];
        if (typeof(chat.rooms[roomname]) == undefined ) {
            socket.write("Room not found. \n");
        } else {
            chat.rooms[roomname].push(id);
            chat.users[id]["room"] = roomname;
            socket.write("Joined " + roomname + "\n" + chat.rooms[roomname].length + " users connected. \n");
        }
    },
    '/rooms' : function(data, socket) {
        if (Object.keys(chat.rooms).length > 0) {
            for (var room in chat.rooms) {
                socket.write(" *  " + room + " (" + chat.rooms[room].length + ") \n");
            }
            socket.write("/join <roomname> to join room. \n");
        } else {
            socket.write("No rooms created yet. /newroom <roomname> to create room. \n");
        }
    },
    '/newroom' : function(data, socket) {
        var id = socket._handle.fd;
        var roomname = data.split(" ")[1];
        if (chat.rooms[roomname] == undefined ) {
            chat.rooms[roomname] = [id];
            chat.users[id]["room"] = roomname;
            socket.write("Room created. \nYou are now connected to " + roomname + "\n");
        } else {
            chat.rooms[roomname].push(id);
            chat.users[id]["room"] = roomname;
            socket.write("Room already created. \nYou are now connected to " + roomname + "\n" + chat.rooms[roomname].length + " users connected. \n");
        }
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
        pub.publish("main_chat", JSON.stringify({"socket": id, "message": cleanData, "name": chat.users[id].name}));
    }
}

sub.on("message", function (channel, data) {
    var data = JSON.parse(data);
    var socket_connected = false;
    var name = data.name || "";
    var message = name + " => " + data.message;

    for (var i = 0; i < sockets.length; i++) {
        if (chat.users[data.socket] == undefined || chat.users[data.socket].socket != sockets[i]) {
            sockets[i].write(message);
        }
    }
});


function checkName(name, socket) {
    var free = true;
    for (var item in chat.users) {
        var user = chat.users[item];
        if (user.name == name) {
            free = false;
            socket.write('Sorry, name taken.\nLogin Name? ');
            break;
        }
    }
    if (free) {
        var id = socket._handle.fd;
        chat.users[id].name = name;
        socket.write('Welcome ' + name + ' \n');
        console.log('Connected User : ' + name);
    }
}

function newSocket (socket) {
    // console.log(util.inspect(socket));
    var id = socket._handle.fd;
    sockets.push(socket);
    chat.users[id] = {name: undefined, socket: socket};
    socket.write('Welcome to the Telnet Server!\n');
    socket.write('Login Name?  ');
    socket.on('data', function(data) {
        receiveData(data, socket);
    }).on('end', function() {
        closeSocket(socket);
        console.log("User disconnected: " + chat.users[id].name);
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
