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
    sendMessage: function(user_id, message) {
        var that = this;
        this.getUser(user_id, function(error, user){
            if (user) {
                user = JSON.parse(user);
                var roomKey = that.roomKey;
                that.getRoom(user[roomKey], function(error, room) {
                    that.redisPubClient.publish("main_chat", JSON.stringify({"socket": user_id, "message": message, "name": user["name"], roomKey: user[roomKey],"sockets":room}));
                });
            } else {
                console.log(user);
                console.log(user_id);
            }
        });
    },
    createOrJoinRoom: function(user_id, roomname, callback) {
        var that = this;
        this.checkRoom(roomname, function(error, exists) {
            if (exists) {
                // room exists, join it
                that.joinRoom(user_id, roomname, function(error, data) {
                    that.getUser(user_id, function(error, user) {
                        user = JSON.parse(user);
                        var message = "Room exists. \nYou are now connected to " + roomname + "\n";
                        if (user[that.roomKey]) {
                            that.leaveRoom(user_id, user[that.roomKey], function(error,status){
                                that.joinRoom(user_id, roomname, function(error, status) {
                                    callback(error, message);
                                });
                            });
                        } else {
                            that.joinRoom(user_id, roomname, function(error, status) {
                                callback(error, message);
                            });
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
            }
        });
    },
    createRoom: function(roomname, callback) {
        this.redisClient.hset(this.roomStore, roomname, JSON.stringify([]));
        callback(false, true);
    },
    getRoom: function(roomname, callback) {
        this.redisClient.hget(this.roomStore, roomname, callback);
    },
    getUser: function(user_id, callback) {
        this.redisClient.hget(this.userStore, user_id, callback);
    },
    joinRoom: function(user_id, roomname, callback) {
        var that = this;
        this.getRoom(roomname, function(error, room) {
            if (room) {
                if (typeof(room) != "object") room = JSON.parse(room);
                that.getUser(user_id, function(error, user){
                    if (typeof(user) != "object") user = JSON.parse(user);
                    var message = user["name"] + " entered the room.";
                    var roomKey = that.roomKey;
                    var current_room = user[roomKey] || "";
                    if (current_room != "") {
                        that.leaveRoom(user_id, current_room, function(error, status){
                            // make user leave room
                        });
                    }
                    if (user[roomKey] != roomname) {
                        room.push(user_id);
                        that.redisClient.hset(that.roomStore, roomname, JSON.stringify(room));
                        that.redisClient.hset(that.userStore, user_id, JSON.stringify({"name": user["name"], "socket":user_id, "room":roomname}))
                        that.redisPubClient.publish("main_chat", JSON.stringify({"message": message, roomKey: roomname, "username": "room_admin"}));
                        callback(false, true);
                    } else {
                        callback(false, "You are already in this room");
                    }
                });
            } else {
                callback(false, false);
            }
        });
    },
    leaveRoom: function(user_id, roomname, callback) {
        var that = this;
        this.getUser(user_id, function(error, user) {
            user = JSON.parse(user);
            var user_room = user[that.roomKey];
            var username = user["name"];
            var roomKey = that.roomKey;
            var return_message = undefined;
            if (user_room && user_room == roomname) {
                var message = username + " left the room.";
                that.redisPubClient.publish("main_chat", JSON.stringify({"message": message, roomKey: roomname, "name": "room_admin"}));
                return_message = 'left room';
            } else {
                return_message = 'not in room';
            }
            that.getRoom(roomname, function(error, room) {
                // remove user from room.
                var roomKey = that.roomKey;
                if (typeof(room) != Object) { room = JSON.parse(room) };
                room = removeItemFromArray(room, user_id);
                that.redisClient.hset(that.roomStore, roomname, JSON.stringify(room));
                that.redisClient.hset(that.userStore, user_id, JSON.stringify({"name" : username, "socket" : user_id}));
                callback(error, return_message);
            });
        });
    },
    getRooms: function(callback) {
        this.redisClient.hgetall(this.roomStore,callback);
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
                var roomKey = that.roomKey;
                that.leaveRoom(user_id, user[roomKey], function(error, status){
                    that.redisClient.hdel(that.userStore, user_id);
                    that.redisClient.hdel(that.usernameStore, user["name"]);
                    callback(error, true);
                });
            }
        });
    },
    resetData: function() {
        this.redisClient.del(this.userStore);
        this.redisClient.del(this.usernameStore);
        this.redisClient.del(this.roomStore);
        console.log('reset');
    }
}

function removeItemFromArray(list, item) {
    if (list && list.length > 0) {
        var index = list.indexOf(item);
        if (index > -1) {
            list.splice(index, 1);
        }
    }
    return list;
}
