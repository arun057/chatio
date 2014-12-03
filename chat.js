module.exports = {
    redisClient : undefined,
    redisPubClient: undefined,
    roomStore : undefined,
    user_store : undefined,
    username_store : undefined,
    roomKey: undefined,
    initialize: function(opts) {
        this.redisClient = opts["redisClient"];
        this.redisPubClient = opts["redisPubClient"];
        this.roomStore = opts["roomStore"] || "rooms";
        this.userStore = opts["userStore"] || 'users';
        this.usernameStore = opts["usernameStore"] || 'usernames';
        this.roomKey = opts["roomKey"] || "room";
    },
    checkRoom: function(roomname, callback) {
        this.redisClient.hexists(this.roomStore, roomname, callback);
    },
    createOrJoinRoom: function(socket, user_id, roomname, callback) {
        var that = this;
        this.checkRoom(roomname, function(error, exists) {
            if (exists) {
                // room exists, join it
                that.getRoom(that.roomStore, roomname, function(error, data) {
                    users = JSON.parse(data);
                    chat.room.users.push(id);
                    that.getUser(user_id, function(error, user) {
                        user = JSON.parse(user);
                        socket.write("Room exists. \nYou are now connected to " + roomname + "\n" + chat.rooms[roomname].length + " users connected. \n");
                        if (user[that.roomKey]) {
                            that.leaveRoom(user_id, user[that.roomKey], function(error,status){
                                that.joinRoom(user_id, roomname, callback);
                            });
                        } else {
                            that.joinRoom(user_id, roomname, callback);
                        }
                    });
                });
            } else {
                // room does not exist, create it
                that.createRoom(roomname, function(error, status){
                    that.joinRoom(user_id, roomname, function(error, status) {
                        callback(error, "Room created. \nYou are now connected to " + roomname + "\n");
                    });
                });
                // FIXME
                chat.rooms[roomname] = [id];
                chat.users[id]["room"] = roomname;
            }
        });
    },
    createRoom: function(roomname, callback) {
        this.redisClient.hset(this.roomStore, roomname, "");
        callback(false, true);
    },
    getRoom: function(roomname, callback) {
        this.redisClient.ghet(this.roomStore, roomname, callback);
    },
    getUser: function(user_id, callback) {
        this.redisClient.hget(this.userStore, user_id, callback);
    },
    joinRoom: function(user_id, roomname, callback) {
        var that = this;
        this.getRoom(roomname, function(error, room) {
            room = JSON.parse(room);
            room.push(user_id);
            that.redisClient.hset(that.roomStore, roomname, JSON.stringify(room));
            var message = username + " entered the room.";
            var roomKey = that.roomKey;
            that.redisPubClient.publish("main_chat", JSON.stringify({"message": message, roomKey: roomname, "username": "room_admin"}));
            callback(false, true);
        });
    },
    leaveRoom: function(user_id, roomname, callback) {
        // reset user
        // join lobby
        var that = this;
        this.getUser(user_id, function(error, user) {
            user = JSON.parse(user);
            var user_room = user[that.roomKey];
            var username = user["username"];
            var roomKey = that.roomKey;
            if (user_room && user_room == roomname) {
                var message = username + " left the room.";
                that.redisPubClient.publish("main_chat", JSON.stringify({"message": message, roomKey: roomname, "username": "room_admin"}));
                callback(undefined, 'left room');
            } else {
                callback(undefined, 'not in room');
            }
        });
    },
    getRooms: function(callback) {
        this.redisClient.hgetall(this.roomStore, callback);
    },
    checkUser: function(username, callback) {
        this.redisClient.hexists(this.usernameStore, username, callback);
    },
    checkAndCreateUser: function(username, socket_id, callback) {
        var that = this;
        this.checkUser(username, function(error, exists) {
            if(exists) {
                callback(error, false);
            } else {
                that.redisClient.hset(that.usernameStore, username, socket_id);
                that.redisClient.hset(that.userStore, socket_id, JSON.stringify({name: username}));
                callback(error, true);
            }
        });
    },
    removeUser: function(user_id, callback) {
        var that = this;
        this.getUser(user_id, function(error, user){
            if (user) {
                user = JSON.parse(user);
                var roomKey = this.roomKey;
                that.leaveRoom(user_id, user[roomKey], function(error, status){
                    that.redisClient.hdel(that.userStore, user_id);
                });
            }
        });
    }
}
