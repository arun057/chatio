(function() {
  var socket = io();
  var username = undefined;
  var current_room = undefined;

  $('form#chat_input').on('submit', function(e) {
    var message_box = $('#m'),
      message = message_box.val();
    socket.emit('chat message', message);
    message_box.val('');
    $('#messages').append($('<li>').text(message));
    e.preventDefault();
    e.stopPropagation();
  });

  $('form#username_input').on('submit', function(e) {
    var username_input = $('#user_name');
    socket.emit('user_create', username_input.val());
    e.preventDefault();
    e.stopPropagation();
  });

  socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
  });

  socket.on('user_create', function(data){
    if (data.status) {
      $('#username_input .error').hide();
      username = data.username;
      loadRooms();
    } else {
      // username not available
      $('#username_input .error').show();
    }
  });

  socket.on('join_room', function(data){
    current_room = data.room;
    loadChat();
  });

  socket.on('create_room', loadChat);

  $('#create_room').on('submit', function(e){
    var name = $('#newroom').val();
    socket.emit('create_room',name);
    e.preventDefault();
    e.stopPropagation();
  });

  function loadChat() {
    // reset chat messages
    // load in new chat.
    $('#messages').html('');
    $('#rooms').animate({'opacity':0},300, function(){
      $(this).hide();
      $('#chat').show().animate({'opacity':1},300, function(){
        //
      });
    });
  }

  $('#switch_rooms').on('click', function(e){
    $('#chat').animate({'opacity':0},300,function(){
      loadRooms();
    });
    e.preventDefault();
    e.stopPropagation();
  });

  function loadRooms() {
    var roomlist = $('#room_list');
    roomlist.html('');
    $.ajax({
      url: "/rooms",
      dataType: "json",
      success: function(data) {
        if (data) {
          $.each(data, function(key, val){
            var element = $('<li>'+key+'</li>');
            roomlist.append(element);
          });
          roomlist.find('li').on('click', function() {
            var name = $(this).text();
            socket.emit('join_room', name);
          });
        }
      }
    });
    $('#user_name').attr('disabled','disabled');
    $('#username').animate({'opacity': 0},350, function() {
        $(this).hide();
        $('#rooms').show().animate({'opacity': 1}, 300, function() {
        $('#create_room').focus();
      });
    });
  }
})();
