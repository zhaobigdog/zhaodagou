var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    room_indexs = [],
	allsockets = {};

app.use('/', express.static(__dirname + '/www'));
server.listen(process.env.PORT || 3001);

io.sockets.on('connection', function(socket) {
    socket.on('login', function(nickname,room) {
    		var ids = [];
    		socket.emit('loginSuccess');  
    		io.sockets.in(room).emit('system', nickname, 'login');
    		socket.nickname = nickname;
    		socket.join(room);
        socket.room = room;
		  	if(room_indexs.indexOf(room) > -1){					
					allsockets[room].push(socket);					
					socket.broadcast.to(room).emit('new_peer', socket.id);   
					var current_room = allsockets[room];
					for(var ii in current_room){
						if(current_room[ii] !== socket){
							ids.push(current_room[ii].id);														
						}					
					}
				}else{				
					room_indexs.push(room);				
					allsockets[room] = [socket];				
				}
				socket.emit('peers', ids, socket.id);  			
    });
    socket.on('disconnect', function() {         
        if(socket.room){		
		        var room = socket.room,
		        		current_room = allsockets[room];
						for(var ii in current_room){
							if( current_room[ii] === socket){
									current_room.splice(ii,1);
							}
						}
						if(current_room.length == 0){
								delete allsockets[room];
								for(var room_ in room_indexs){
									if( room_indexs[room_] == room){
											room_indexs.splice(room_,1);
									}
								}
						}
		        socket.broadcast.to(room).emit('remove_peer', socket.id);
		        socket.broadcast.to(room).emit('system', socket.nickname, 'logout');
      	}
    });   
    socket.on('postMsg', function(msg, color) {		
        socket.broadcast.to(socket.room).emit('newMsg', socket.nickname, msg, color);
    });
    socket.on('img', function(imgData, color) {
        socket.broadcast.to(socket.room).emit('newImg', socket.nickname, imgData, color);
    });
    socket.on('_ice_candidate', function(data) {
    		var curSocket,							
						current_room = allsockets[socket.room];
				for(var i in current_room){
					if (data.socketId === current_room[i].id) {
						curSocket = current_room[i];
					}			
				}
				curSocket.emit('ice_candidate', {
					"label": data.label,
					"candidate": data.candidate,
					"socketId": socket.id
				});			
    });
    socket.on('_offer', function(data) {  	
    		var curSocket,							
						current_room = allsockets[socket.room];
				for(var i in current_room){
					if (data.socketId === current_room[i].id) {
						curSocket = current_room[i];
					}			
				}			
    	 curSocket.emit('offer', {
						"sdp": data.sdp,
						"socketId": socket.id		
				});
	  });
    socket.on('_answer', function(data) {    	
    		var curSocket,							
					  current_room = allsockets[socket.room];
				for(var i in current_room){
					if (data.socketId === current_room[i].id) {
						curSocket = current_room[i];
					}			
				}			
				curSocket.emit('answer', {
						"sdp": data.sdp,
						"socketId": socket.id		
				});
	  });
});