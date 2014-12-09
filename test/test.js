var assert = require("assert");
var chatService = require("../chat.js");
var net = require('net'),
    redis = require('redis'),
    pub = redis.createClient(),
    sub = redis.createClient(),
    client = redis.createClient();

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

chatService.resetData();


describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    });
  });
});


describe('Chat Service', function(){
	describe('create user',function(){
		it('should create a new user', function(){
			chatService.checkAndCreateUser("user1", "user1", function(error, status){
				assert.equal(true,status);
			});
		});
		it('should not be able to create the same user again', function(){
			chatService.checkAndCreateUser("user1", "user1", function(error, status){
				assert.equal(false,status);
			});
		});
	});
});
