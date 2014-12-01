var net = require('net');
var util = require('util');

var sockets = [];
var rooms = [];

var chat = {
	rooms: [],
	sockets: {}
};

/*
 *  clients
 *  [
 *  	'name' : {
 *  		'socket_id' : <>
 *  	}
 *  ]
 */
var clients = [];
var commands = {
	'@quit' : function(data, socket) {
		socket.end('Goodbye!\n');
	},
	'@help' : function(data, socket) {
		//
	},
	'@name' : function(data, socket) {
		socket.write('Your name is : ' + chat.sockets[socket].name + '\n');
	},
	'@total' : function(data, socket) {
		socket.write(sockets.length + " \n");
		socket.write(Object.keys(chat.sockets).length + "\n");
	}
};

function receiveData(data, socket) {
	var cleanData = stripData(data);
	if(typeof(commands[cleanData]) !== "undefined" ) {
		commands[cleanData](data,socket);
	} else if(chat.sockets[socket].name === undefined) {
		checkName(cleanData, socket);
	} else {
		for (var i = 0; i < sockets.length; i++) {
			if (sockets[i] !== socket) {
				sockets[i].write("=> " + data);
			}
		}
	}
}

function checkName(name, socket) {
	var free = true;
	for (var item in chat.sockets) {
		if(item.name == name) {
			free = false;
			socket.write('Sorry, name taken.\nLogin Name? ');
			break;
		}
	}
	if (free === true) {
		chat.sockets[socket].name = name;
		socket.write('Welcome ' + name + ' \n');
		console.log('Connected User : ' + name);
	}
}

function newSocket (socket) {
	sockets.push(socket);
	chat.sockets[socket] = {name: undefined};
	socket.write('Welcome to the Telnet Server!\n');
	socket.write('Login Name?  ');
	socket.on('data', function(data) {
		console.log(socket.address());
		receiveData(data, socket);
	}).on('end', function() {
		closeSocket(socket);
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
