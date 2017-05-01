var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
	res.send('AEROPHANE CHESS SERVER\n');
	res.send('Node.js is running.\n');
	res.send('Copyright Rijn, pixelnfinite.com, 2015.\n');
});


//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;

var gameSetting = {};

gameSetting.turn = 0;
gameSetting.registerColor = {};
gameSetting.vote = {};
gameSetting.playerCount = 0;
gameSetting.lock = 0;

io.on('connection', function(socket){
	console.log('a user connected');

	socket.on('login', function(obj){

		socket.name = obj.userid;

		var flag = 1;

		if(!onlineUsers.hasOwnProperty(obj.userid)) {
			for(key in onlineUsers) {
		        if(onlineUsers.hasOwnProperty(key) && (onlineUsers[key].username==obj.username || (onlineUsers[key].color!=4 && onlineUsers[key].color==obj.content))){
		        	flag = 0;
				}
		    }
		}

		if(gameSetting.lock) flag = 0;

		if(flag){
			onlineUsers[obj.userid] = {username:obj.username, color:obj.content};
			if(obj.content!=4) gameSetting.playerCount ++;
			gameSetting.registerColor[obj.content] = 1;
			onlineCount++;

			io.emit('login', {type:1, onlineUsers:onlineUsers});
			console.log(obj.username+' login as ' +obj.content);

			socket.send({type : 4, username : obj.username, content : obj.content});

			console.log("onlineCount="+onlineCount);
		}else{
			socket.send({type : 8});
			console.log("error");
		}


	});
	
	//监听用户退出
	socket.on('disconnect', function(){
		//将退出的用户从在线列表中删除
		if(onlineUsers.hasOwnProperty(socket.name)) {
			//退出用户的信息
			var obj = {userid:socket.name, userobj:onlineUsers[socket.name]};
			
			//删除
			gameSetting.registerColor[onlineUsers[socket.name].color] = 0;
			if(onlineUsers[socket.name].color != 4) gameSetting.playerCount --;
			delete onlineUsers[socket.name];

			//在线人数-1
			onlineCount--;
			
			//向所有客户端广播用户退出
			io.emit('logout', {type:1, onlineUsers:onlineUsers});
			console.log(obj.userobj.username+' logout');
			console.log("onlineCount="+onlineCount);
		}
	});
	
	//监听用户发布聊天内容
	socket.on('message', function(obj){
		//向所有客户端广播发布的消息
	    var myDate = new Date();
    	var temp = "("+myDate.getHours()+":"+myDate.getMinutes()+":"+myDate.getSeconds()+"):";
		io.emit('message', {type:3, content:obj.username+temp+obj.content});
		console.log(obj.username+' says:'+obj.content);
	});

	socket.on('server', function(obj){
		var obj = {
			type : 0,
			username : "",
			content : "ACS VERSION 1.0"
		};
		socket.send(obj);
	});

	socket.on('getSetting', function(obj){
		console.log("requireSetting");
		socket.send({type:1, onlineUsers:onlineUsers});
		/*
		for(i = 0; i < onlineCount; i++){
			console.log(i + ", " + gameSetting[i].username + ", " + gameSetting[i].content);
			socket.send(gameSetting[i]);
		}
		*/
	});

	socket.on('nextStep', function(obj){
		var nextTurn = null;
		for(i=gameSetting.turn+1;i<4;i++){
			if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
		}
		for(i=0;i<4;i++){
			if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
		}
		gameSetting.turn = nextTurn;
		console.log("PLAYER " + obj.color + " CHESS " + obj.chess + " MOVE " + obj.step + " NEXT " + gameSetting.turn);
		io.emit('message', {type:2, color:obj.color, chess:obj.chess, step:obj.step, next:gameSetting.turn});
	});

	socket.on('throw', function(obj){
		if(!obj.available){
			var nextTurn = null;
			for(i=gameSetting.turn+1;i<4;i++){
				if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
			}
			for(i=0;i<4;i++){
				if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
			}
			gameSetting.turn = nextTurn;
		}
		console.log("PLAYER " + obj.color + " THROW " + obj.dice + " NEXT " + gameSetting.turn);
		io.emit('message', {type:5, color:obj.color, dice:obj.dice, next:gameSetting.turn});
	});

	socket.on('skip', function(obj){
		var nextTurn = null;
		for(i=gameSetting.turn+1;i<4;i++){
			if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
		}
		for(i=0;i<4;i++){
			if(nextTurn === null) if(gameSetting.registerColor[i]) nextTurn = i;
		}
		gameSetting.turn = nextTurn;
		io.emit('message', {type:9, color:obj.color, next:gameSetting.turn});
	});

	socket.on('gameReset', function(obj){
		if(obj.hasOwnProperty("reset")){
			console.log(obj.username + " initiate reset");
			for(i=0;i<4;i++){
				gameSetting.vote[i] = 0;
			}
			io.emit('message', {type:6, reset:1, username:obj.username});
		};
		if(obj.hasOwnProperty("vote")){
			console.log(obj.color + " VOTE " + obj.result);
			gameSetting.vote[obj.color] = obj.result*2-1;
			io.emit('message', {type:6, vote:1, result:obj.result, color:obj.color});

			var sum = 0, count = 0; 
			for(i=0;i<4;i++){
				sum += gameSetting.vote[i];
				count += gameSetting.vote[i]!=0?1:0;
			};
			if((count >= 2 && sum > 0)){
				io.emit('message', {type:6, voteRes:1, result:1});
			}else{
				//io.emit('message', {type:6, voteRes:1, result:0});
			};
			console.log(count + "/" + gameSetting.playerCount);
			if(count == gameSetting.playerCount){
				if(sum>0){
					io.emit('message', {type:6, voteRes:1, result:1});
				}else{
					io.emit('message', {type:6, voteRes:1, result:0});
				};
			};
		};
	});

	socket.on('lock', function(obj){
		if(gameSetting.lock == 1){
			gameSetting.lock = 0;
			console.log(obj.username + " unlock");
			io.emit('message', {type:7, username:obj.username, lock:gameSetting.lock});
		}else{
			gameSetting.lock = 1;
			io.emit('message', {type:7, username:obj.username, lock:gameSetting.lock});
		}
	})
  
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});
