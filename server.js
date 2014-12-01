var net = require('net'),
    util = require('util'),
    redis = require('redis'),
    pub = redis.createClient(),
    sub = redis.createClient(),
    client = redis.createClient(),
    sockets = [],
    rooms = [],
    chat = {
        rooms: [],
        sockets: {}
    };


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
        socket.write('Your name is : ' + chat.sockets[id].name + '\n');
    },
    '@total' : function(data, socket) {
        socket.write(sockets.length + " \n");
        socket.write(Object.keys(chat.sockets).length + "\n");
    }
};

function receiveData(data, socket) {
    var id = socket._handle.fd;
    var cleanData = stripData(data);
    if(typeof(commands[cleanData]) !== "undefined" ) {
        commands[cleanData](data,socket);
    } else if(chat.sockets[id].name === undefined) {
        checkName(cleanData, socket);
    } else {
        cleanData = cleanData + "\n";
        pub.publish("main_chat", JSON.stringify({"socket": id, "message": cleanData, "name": chat.sockets[id].name}));
    }
}

sub.on("message", function (channel, data) {
    var data = JSON.parse(data);
    var socket_connected = false;
    var name = data.name || "";
    var message = name + " => " + data.message;

    for (var i = 0; i < sockets.length; i++) {
        if (chat.sockets[data.socket] == undefined || chat.sockets[data.socket].socket != sockets[i]) {
            sockets[i].write(message);
        }
    }
});


function checkName(name, socket) {
    var free = true;
    for (var item in chat.sockets) {
        var user = chat.sockets[item];
        if (user.name == name) {
            free = false;
            socket.write('Sorry, name taken.\nLogin Name? ');
            break;
        }
    }
    if (free) {
        var id = socket._handle.fd;
        chat.sockets[id].name = name;
        socket.write('Welcome ' + name + ' \n');
        console.log('Connected User : ' + name);
    }
}

function newSocket (socket) {
    // console.log(util.inspect(socket));
    var id = socket._handle.fd;
    sockets.push(socket);
    chat.sockets[id] = {name: undefined, socket: socket};
    socket.write('Welcome to the Telnet Server!\n');
    socket.write('Login Name?  ');
    socket.on('data', function(data) {
        receiveData(data, socket);
    }).on('end', function() {
        closeSocket(socket);
        console.log("User disconnected: " + chat.sockets[id].name);
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
