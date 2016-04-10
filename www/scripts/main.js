/*
 *rtc v0.0.1
 *Zhao_BigDog 2016.4.5
 *MIT license
 *view on GitHub:https://github.com/zhaobigdog/zhaodagou.git
 *see it in action:http://zhaodagou.heroku.com/
 */
var PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var URL = (window.URL || window.webkitURL || window.msURL || window.oURL);
var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate);
var nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription);
var moz = !!navigator.mozGetUserMedia;
var iceServer = {
    "iceServers": [{
        "url": "stun:stun.l.google.com:19302"
    }]
};
var localMediaStream = null;
var room = "";
var fileData = {};
var me = null;
var peerConnections = {};
var connections = [];
var numStreams = 0;
var initializedStreams = 0;  

window.onload = function() {
    var videochat = new VideoChat();
    videochat.init();
    resizeBg();
};
var VideoChat = function() {
    this.socket = null;
};
VideoChat.prototype = {
    init: function() {
        var that = this;
        this.socket = io.connect();
        this.socket.on('connect', function() {
            $('#nickWrapper').css('display','block');
            $('#nicknameInput').focus();          
        });
        this.socket.on('loginSuccess', function() {
        		room = $('#room').val();
        		$(document).attr("title",room + '|' + $('#nicknameInput').val());
            $('#roomname').text(room);
            $('#loginWrapper').css('display','none');
            $('#messageInput').focus();
        });              
        this.socket.on('error', function(err) {
            if ($('#loginWrapper').css('display','none')) {
                $('#status').text('!fail to connect :(');
            } else {
                $('#info').text('!fail to connect :(');
            }
        });
        this.socket.on('system', function(nickName, type) {
            that._displaySystemMsg(nickName, type);            
        });
        this.socket.on('newMsg', function(user, msg, color) {
            that._displayNewMsg(user, msg, color);
        });
        this.socket.on('newImg', function(user, img, color) {
            that._displayImage(user, img, color);
        });
        this.socket.on('new_peer', function(socketId) {
						connections.push(socketId);
            var pc = that._createPeerConnection(socketId),
                i, m;
            pc.addStream(localMediaStream);           
        });
        this.socket.on('peers', function(connections_, you) {
            connections = connections_;
            me = you;						
            that._initStream({"video": true,"audio": true});
        });
        this.socket.on('ice_candidate', function(data) {
             var candidate = new nativeRTCIceCandidate(data);
           	 var pc = peerConnections[data.socketId];
             pc.addIceCandidate(candidate);
        });
        this.socket.on('offer', function(data) {
            that._receiveOffer(data.socketId, data.sdp);
        });
        this.socket.on('answer', function(data) {
            that._receiveAnswer(data.socketId, data.sdp);
        });
        this.socket.on('remove_peer', function(socketId) {
            that._closePeerConnection(peerConnections[socketId]);
            delete peerConnections[socketId];
            var video = $('#video_ele_' + socketId);
			if(video){
			  $(video).remove();
			}
        });
        $('#loginBtn').click(function() {
            var nickName = $('#nicknameInput').val();
            var room = $('#room').val();
            if (nickName.trim().length != 0 && room.trim().length != 0) {
                that.socket.emit('login', nickName , room);
            } else {
                $('#nicknameInput').focus();
            };
        });
        $('#sendBtn').click(function() {
            var msg = $('#messageInput').val(),
                color = $('#colorStyle').val();
            $('#messageInput').val('');
            $('#messageInput').focus();
            if (msg.trim().length != 0) {
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('me', msg, color);
                return;
            };
        });        
        $('#messageInput').keyup(function(e) {
        		var msg = $('#messageInput').val(),
                color = $('#colorStyle').val();
            if (e.keyCode == 13 && msg.trim().length != 0) {               
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('me', msg, color);
                $('#messageInput').val('');
            };
        });
        $('#clearBtn').click(function() {
            $('#historyMsg').html('');
        });
        $('#sendImage').change(function() {
            if (this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader(),
                    color = $('#colorStyle').val();
                if (!reader) {
                    that._displayNewMsg('system', '!your browser doesn\'t support fileReader', 'red');
                    this.value = '';
                    return;
                };
                reader.onload = function(e) {
                    this.value = '';
                    that.socket.emit('img', e.target.result, color);
                    that._displayImage('me', e.target.result, color);
                };
                reader.readAsDataURL(file);
            };
        });
        this._initialEmoji();
        $('#emoji').click(function(e) {
            $('#emojiWrapper').css('display','block');
            e.stopPropagation();
        });
        $(document).click(function(e) {
            var emojiwrapper = $('#emojiWrapper');
            if (e.target != emojiwrapper) {
                $(emojiwrapper).css('display','none');
            };
        });
        $('#emojiWrapper').click(function(e) {
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = $('#messageInput');
                $(messageInput).focus();
                $(messageInput).val( $(messageInput).val() + '[emoji:' + target.title + ']');
            };
        });  
    },
    _initialEmoji: function() {
        var emojiContainer = $('#emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 1; i < 91; i++) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        $(emojiContainer).append(docFragment);
    },
    _displayNewMsg: function(user, msg, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8),
            msg = this._showEmoji(msg);
        msgToDisplay.style.color = color || '#000';        
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span></br>&nbsp&nbsp&nbsp&nbsp&nbsp' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _displaySystemMsg: function(nickname, type) {   		
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8),
            msg;
        msgToDisplay.style.color = '#7e7ece';    
        msgToDisplay.style.textAlign = 'center';
        if(type == 'login')
    				msg = '~~~ Welcome~ ' + nickname + '<span class="timespan">(' + date + ')</span>' + ' ~~~';
    		else
    				msg = '~~~ Goodbye~ ' + nickname + '<span class="timespan">(' + date + ')</span>' + ' ~~~'; 	
        msgToDisplay.innerHTML =  msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _displayImage: function(user, imgData, color) {
        var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span> <br/>' + '<a href="' + imgData + '" target="_blank"><img src="' + imgData + '"/></a>';
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = $('#emojiWrapper').children().length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');
            };
        };
        return result;
    },
    _initStream: function(options) {
    		var that = this;
        options.video = !!options.video;
        options.audio = !!options.audio;

        if (getUserMedia) {
            numStreams++;
            getUserMedia.call(navigator, options, function(stream) {
                    localMediaStream = stream;
                    initializedStreams++;
                    $('#video_ele_me').css('display','block');
                    $('#me').attr('src', URL.createObjectURL(stream));
    								document.getElementById('me').play();
                    if (initializedStreams === numStreams) {
                        that._createPeerConnections();
						            that._addStreams();
						            that._sendOffers();
                    }
                },
                function(error) {
                		alert("stream_create_error");
                });
        } else {
        		alert("WebRTC is not yet supported in this browser.");
        }
    },
    _createPeerConnections: function() {
    		var that = this;
    		var i, m;
        for (i = 0, m = connections.length; i < m; i++) {     
            that._createPeerConnection(connections[i]);
        }
    },
    _createPeerConnection: function(socketId) {		
    		var that = this;    
        var pc = new PeerConnection(iceServer);
        peerConnections[socketId] = pc;
        pc.onicecandidate = function(evt) {
            if (evt.candidate){
                that.socket.emit('_ice_candidate',{"label": evt.candidate.sdpMLineIndex, "candidate": evt.candidate.candidate, "socketId": socketId});
            }
        };

        pc.onopen = function() {
            that.emit("pc_opened", socketId, pc);
        };

        pc.onaddstream = function(evt) {    
				    var id = "other-" + socketId,
				    		newvideo = '<div class="video_ele" id="video_ele_'+socketId+'" >'+	        	
										        	'<div class="video_ele_title">'+
										            	'<h3>video</h3>'+
										          '</div>	'+
										          '<div class="video_ele_cont clearfix">'+
										          	'<video id="'+id+'" autoplay></video>'+
										          '</div>'+
									      	'</div>';
						$('#videos').append(newvideo);		
						that._attachStream(evt.stream, id);	     
        };

        pc.ondatachannel = function(evt) {
            that.addDataChannel(socketId, evt.channel);
            that.emit('pc_add_data_channel', evt.channel, socketId, pc);
        };
        return pc;
    },
    _addStreams: function() {
    	var i, m,
          stream,
          connection;
      for (connection in peerConnections) {
          peerConnections[connection].addStream(localMediaStream);
      }
    },
    _sendOffers: function() {
    	var i, m,
          pc,
          that = this,
          pcCreateOfferCbGen = function(pc, socketId) {
              return function(session_desc) {
                  pc.setLocalDescription(session_desc);     
                  that.socket.emit('_offer',{
                          "sdp": session_desc,
                          "socketId": socketId
                  });
              };
          },
          pcCreateOfferErrorCb = function(error) {
              console.log(error);
          };
      for (i = 0, m = connections.length; i < m; i++) {
          pc = peerConnections[connections[i]];
          pc.createOffer(pcCreateOfferCbGen(pc, connections[i]), pcCreateOfferErrorCb);
      }
    },
    _receiveOffer: function(socketId, sdp) {
    		var that = this;
        that._sendAnswer(socketId, sdp);
    },
    _sendAnswer: function(socketId, sdp) {
    		var pc = peerConnections[socketId];
        var that = this;
        pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
        pc.createAnswer(function(session_desc) {
            pc.setLocalDescription(session_desc);
            that.socket.emit('_answer',{                   
                    "sdp": session_desc,
                    "socketId": socketId
                });
        }, function(error) {
            console.log(error);
        });
    },
    _receiveAnswer : function(socketId, sdp) {
    		var pc = peerConnections[socketId];
        pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
    },
    _attachStream : function(stream, domId) {
        var element = document.getElementById(domId);
        if (navigator.mozGetUserMedia) {
            element.mozSrcObject = stream;
            element.play();
        } else {
            element.src = webkitURL.createObjectURL(stream);
        }
        element.src = webkitURL.createObjectURL(stream);
    },
    _closePeerConnection : function(pc) {
        if (!pc) return;
        pc.close();
    }
};
