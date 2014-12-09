chatio
======

A chat server that can be connected to over telnet and http.




Installation:
----

**Application Uses:**

node.js

redis

socket.io

express


	# Clone the repo and run
	npm install
	
	node server.js # starts the telnet server
	
	node index.js  # starts the web server



Webapp can be accessed on port 8080.

	http://localhost:8080


Telnet to port 9399 to access chat over telnet.

	telnet localhost 9399
	



Deployment:
----

I recommend setting up [forever](https://github.com/nodejitsu/forever) to run the app on a server.


Testing:
---

[Mocha](https://github.com/mochajs/mocha) is used for unit testing on this app. Not everything is tested.

  mocha test

TODO:
--

* Get more unit tests going
* HTML client has some bugs that need to be fixed
* Ability to be in multiple rooms
* Ability to send private messages
