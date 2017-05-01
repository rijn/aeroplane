(function () {
	var d = document,
	w = window,
	p = parseInt,
	dd = d.documentElement,
	db = d.body,
	dc = d.compatMode == 'CSS1Compat',
	dx = dc ? dd: db,
	ec = encodeURIComponent;

	function getElementsByClassName(node,classname) {
	  if (node.getElementsByClassName) { // use native implementation if available
	    return node.getElementsByClassName(classname);
	  } else {
	    return (function getElementsByClass(searchClass,node) {
	        if ( node == null )
	          node = document;
	        var classElements = [],
	            els = node.getElementsByTagName("*"),
	            elsLen = els.length,
	            pattern = new RegExp("(^|\\s)"+searchClass+"(\\s|$)"), i, j;

	        for (i = 0, j = 0; i < elsLen; i++) {
	          if ( pattern.test(els[i].className) ) {
	              classElements[j] = els[i];
	              j++;
	          }
	        }
	        return classElements;
	    })(classname, node);
	  }
	}

	w.AERO = {
		//server : "127.0.0.1",
		server : "lab.rijnx.com",
		username : null,
		userid : null,
		socket : null,
		color : null,
		turn : 0,
		win : 0,
		status : 0,
		chesssize: null,
		availablestep: null,
		constPosition : {},
		chess : new Array(),

		console : function (content){
			d.getElementById("control-panel").innerHTML = content + "<br>" + d.getElementById("control-panel").innerHTML;
		},
		message : function (content){
			d.getElementById("control-panel").innerHTML = "<b>" + content + "</b><br>" + d.getElementById("control-panel").innerHTML;
		},
		gameReset : function (){
			AERO.turn = 0,
			AERO.availablestep = 0,
			AERO.chess = new Array();
			for(i = 0; i < 4; i++){
				AERO.chess[i] = new Array();
				for(j = 0; j < 4; j++){
					AERO.chess[i][j] = -1;
				}
			}
			d.getElementById("turn").innerHTML = "WAITING";
			d.getElementById("number").innerHTML = "";
			AERO.refreshChessboard();
		},
		init : function(username){
			this.userid = this.genUid();
			this.username = username;
			
			//d.getElementById("showusername").innerHTML = this.username;
			//this.msgObj.style.minHeight = (this.screenheight - db.clientHeight + this.msgObj.clientHeight) + "px";
			//this.scrollToBottom();

			w.AERO.socket = io.connect('ws://'+AERO.server+':3000');
			this.socket = w.AERO.socket;
			AERO.console("socket.io connect "+AERO.server+":3000");

			this.socket.emit('server', null);
		},

		login : function(username, color){
			this.userid = this.genUid();
			this.socket = w.AERO.socket;
			this.socket.emit('login', {userid:this.userid, username:username, content:color});
		},

		listen : function(){
			this.socket = w.AERO.socket;

			this.socket.on('login', function(o){
				AERO.updateSysMsg(o.onlineUsers);
				//AERO.updateSysMsg(o, 'login');	
			});

			this.socket.on('logout', function(o){
				AERO.updateSysMsg(o.onlineUsers);
				//AERO.updateSysMsg(o, 'logout');
			});

			this.socket.on('message', function(obj){
				//console.log(obj);
				/*
				 * 0 => Server info
				 * 1 => onlineUsers
				 * 2 => Player step
				 * 3 => Chat
				 * 4 => register success(0-3 color 4 watcher)
				 * 5 => throw
				 * 6 => game reset
				 * 7 => lock
				 * 8 => error
				 * 9 => skip
				 */
				if(obj.type == 0){
					AERO.console(obj.content);
				}
				if(obj.type == 1){
					AERO.console("GAME SETTING:");
					var element = getElementsByClassName(d, "color-button");
					for(key in obj.onlineUsers) {
				        if(obj.onlineUsers.hasOwnProperty(key)){
				        	if(obj.onlineUsers[key].color<4) element[obj.onlineUsers[key].color].className = element[obj.onlineUsers[key].color].className + " selected";
						}
				    }
					AERO.updateSysMsg(obj.onlineUsers);
					//element[obj.content].className = element[obj.content].className + " selected";
				}
				if(obj.type == 2){
					AERO.turn = obj.next;
					AERO.displayStep(obj.color, obj.chess, obj.step);
				}

				if(obj.type == 3){
					AERO.message(obj.content);
					/*
					var isme = (obj.userid == AERO.userid) ? true : false;
					var contentDiv = '<div>'+obj.content+'</div>';
					var usernameDiv = '<span>'+obj.username+'</span>';
					
					var section = d.createElement('section');
					if(isme){
						section.className = 'user';
						section.innerHTML = contentDiv + usernameDiv;
					} else {
						section.className = 'service';
						section.innerHTML = usernameDiv + contentDiv;
					}
					AERO.msgObj.appendChild(section);
					AERO.scrollToBottom();	
					*/
				}

				if(obj.type == 4){
					AERO.console(obj.username + " login as "+obj.content+" successful");
				}

				if(obj.type == 5){
					AERO.turn = obj.next;
					AERO.console("PLAYER " + obj.color + " THROW " + obj.dice);
					AERO.nextTurn();
				}

				if(obj.type == 6){
					if(obj.hasOwnProperty("reset") && AERO.color!=4){
						AERO.console(obj.username + " initiate RESET");
						d.getElementById("reset-overlay").style.display = "block";
					}
					if(obj.hasOwnProperty("vote")){
						if(obj.result){
							AERO.console("PLAYER " + obj.color + " CHOOSE YES");
						}else{
							AERO.console("PLAYER " + obj.color + " CHOOSE NO");
						}
					}
					if(obj.hasOwnProperty("voteRes")){
						if(obj.result){
							AERO.console("GAME RESET");
							AERO.gameReset();
						}else{
							AERO.console("GAME CONTINUE");
						}
					}
				}

				if(obj.type == 7){
					if(obj.lock){
						AERO.console(obj.username + " lock");
					}else{
						AERO.console(obj.username + " unlock");
					}					
				}

				if(obj.type == 8){
					AERO.console("SYSTEM ERROR *");
					AERO.socket.disconnect();
				}

				if(obj.type == 9){
					AERO.console("SKIP PLAYER "+obj.color);
					AERO.turn = obj.next;
					AERO.nextTurn();
				}


			});

		},

		logout : function (){
			AERO.socket.disconnect();
			//location.reload();
		},
		genUid : function(){
			return new Date().getTime()+""+Math.floor(Math.random()*899+100);
		},
		updateSysMsg : function(onlineUsers){
			var onlineCount = 0;
			var html = "";
			for(key in onlineUsers){
				if(onlineUsers.hasOwnProperty(key)){
					onlineCount ++;
					AERO.console(onlineUsers[key].username + " plays " + onlineUsers[key].color);
					html += '<div class="user color' + onlineUsers[key].color + '">' + onlineUsers[key].username + '</div>';
				}
			}
			d.getElementById("online-users").innerHTML = html;
			/*
			var onlineUsers = o.onlineUsers;
			var onlineCount = o.onlineCount;
			var user = o.user;

			var userhtml = '';
			var separator = '';
			for(key in onlineUsers) {
		        if(onlineUsers.hasOwnProperty(key)){
					userhtml += separator+onlineUsers[key];
					separator = ', ';
				}
		    }
			d.getElementById("onlinecount").innerHTML = onlineCount+' ONLINE: '+userhtml;

			var html = '';
			html += '<div class="msg-system">';
			html += user.username;
			html += (action == 'login') ? ' LOGIN' : ' LOGOUT';
			html += '</div>';
			var section = d.createElement('section');
			section.className = 'system J-mjrlinkWrap J-cutMsg';
			section.innerHTML = html;
			this.msgObj.appendChild(section);
			AERO.console(html);
			AERO.console(onlineCount+' ONLINE: '+userhtml);

			this.scrollToBottom();
			*/
		},
		getSetting : function (){
			w.AERO.socket.emit('getSetting', null);
		},


		msgObj:d.getElementById("message"),
		screenheight:w.innerHeight ? w.innerHeight : dx.clientHeight,
		screenwidth:w.innerWidth ? w.innerWidth : dx.clientWidth,
		clientlength: this.screenheight > this.screenwidth ? this.screenwidth : this.screenheight,

		refreshClientSize : function(){
			AERO.screenheight = w.innerHeight ? w.innerHeight : dx.clientHeight;
			AERO.screenwidth = w.innerWidth ? w.innerWidth : dx.clientWidth;
			AERO.clientlength = AERO.screenheight > AERO.screenwidth ? AERO.screenwidth : AERO.screenheight;
			AERO.chesssize = 80/970*AERO.clientlength;
		},

		registerChessEvents : function(){
			var element = getElementsByClassName(d.getElementById("chess-board"), "chess");

			for(i = 0; i < element.length; i++){
				if(element[i].getAttribute("color") == AERO.color){
					element[i].onclick = function() {
						if(AERO.availablestep>0 && AERO.chess[this.getAttribute("color")][this.getAttribute("chess")] >=0 && AERO.chess[this.getAttribute("color")][this.getAttribute("chess")]<56){
							AERO.nextStep(this.getAttribute("color"), this.getAttribute("chess"), AERO.availablestep);
						}else if((AERO.availablestep==6 || AERO.availablestep==5) && AERO.chess[this.getAttribute("color")][this.getAttribute("chess")] == -1){
							AERO.nextStep(this.getAttribute("color"), this.getAttribute("chess"), 1);
						}
					};
				};
			};
		},

		//提交聊天消息内容
		chatSend:function(){
			var content = d.getElementById("chat-input").value;
			if(content != '' && AERO.username !== null){
				var obj = {
					userid: this.userid,
					username: this.username,
					content: content
				};
				AERO.socket.emit('message', obj);
				d.getElementById("chat-input").value = '';
			}
			if(content == "RESET" && AERO.color!=4) AERO.socket.emit('gameReset', {reset:1, username:AERO.username});
			if(content == "LOCK" && AERO.color!=4) AERO.socket.emit('lock', {username:AERO.username});
			return false;
		},

		registerSubmit : function(){
			var username = d.getElementById("username-box").value;
			var color = 4;

			var element = getElementsByClassName(d, "color-button");
			for(i = 0; i < element.length; i++){
				if(element[i].className.indexOf("clicked")>0) color = i;
			}
			AERO.console("registerSubmit:"+username);
			AERO.username = username;
			AERO.color = color;
			AERO.console("USERNAME:"+username);
			AERO.console("COLOR:"+color);
			AERO.registerChessEvents();
			if(username != ""){
				this.login(username, color);
			}
			return false;
		},

		refreshChessboard : function(){
			for(i = 0; i < 4; i++){
				for(j = 0; j < 4; j++){
					var pos = AERO.constPosition[AERO.chess[i][j]];
					var positionTemp = {};
					positionTemp.x = Math.abs(((i==1||i==2)?1:0)-((i%2)?pos.y:pos.x)) * AERO.clientlength;
					positionTemp.y = Math.abs((i>1?1:0)-((i%2)?pos.x:pos.y)) * AERO.clientlength;

					d.getElementById("chess"+i+""+j).style.left = (positionTemp.x - (AERO.chesssize/2)) + "px";
					d.getElementById("chess"+i+""+j).style.top = (positionTemp.y - (AERO.chesssize/2)) + "px";
				}
			}
		},

		throwJudge : function(dice){
			var temp = 1;
			for(i=0;i<4;i++){
				if(AERO.chess[AERO.color][i]!=-1 && AERO.chess[AERO.color][i]!=56){
					temp = 0;
				}
			}
			if(!temp || dice == 6 || dice == 5) return true; else return false;
			/*
			var temp = 0;
			for(j = 0; j < 4; j++){
				temp += AERO.chess[AERO.color][j];
			}
			console.log(temp);
			if(temp>-4 || dice == 6) return true; else return false;
			*/
		},

		logicJudge : function(color, chess, step){
			//击中回家
			for(i = 0; i < 4; i++)
				for(j = 0; j < 4; j++){

					//console.log(AERO.chess[i][j]+13*(i-color));
					if(color != i && (AERO.chess[color][chess]>0 && AERO.chess[color][chess]<=50) && (AERO.chess[i][j]>0 && AERO.chess[i][j]<=50) && (AERO.chess[i][j]+13*(i-color)+52)%52 == AERO.chess[color][chess] && !(i==color && j==chess)){
						AERO.chess[i][j] = -1;
						AERO.console("PLAYER " + color + " CHESS " + chess + " HIT PLAYER " + i + " CHESS " + j);
					}
				}

			//快速通道
			var temp = AERO.chess[color][chess];
			console.log(temp);
			if(temp>0 && temp<=50){
				if((temp-2)%4 == 0){
					if(temp == 18){
						temp = 30;
					}else{
						temp = temp+4;
					}
				}
			}
			AERO.chess[color][chess] = temp;

			//击中回家
			for(i = 0; i < 4; i++)
				for(j = 0; j < 4; j++){

					//console.log(AERO.chess[i][j]+13*(i-color));
					if(color != i && (AERO.chess[color][chess]>0 && AERO.chess[color][chess]<=50) && (AERO.chess[i][j]>0 && AERO.chess[i][j]<=50) && (AERO.chess[i][j]+13*(i-color)+52)%52 == AERO.chess[color][chess] && !(i==color && j==chess)){
						AERO.chess[i][j] = -1;
						AERO.console("PLAYER " + color + " CHESS " + chess + " HIT PLAYER " + i + " CHESS " + j);
					}
				}

			if(color == AERO.color){
				var sum = 0;
				for(j=0;j<4;j++){
					sum += AERO.chess[AERO.color][j];
				};
				if(sum==56*4)AERO.win = 1;
			}


			AERO.refreshChessboard();
			AERO.nextTurn();
		},

		nextStep : function(color, chess, step){
			//AERO.chess[color][chess] += step;
			AERO.availablestep = 0;
			AERO.socket.emit('nextStep', {color:color, chess:chess, step:step});
			d.getElementById("number").innerHTML = "";
			AERO.console("SEND:PLAYER " + color + " CHESS " + chess + " MOVE " + step + " FROM " + AERO.chess[color][chess]);
			AERO.refreshChessboard();
			//AERO.logicJudge(color, chess, step);
		},

		displayStep : function(color, chess, step){
			AERO.chess[color][chess] += step;
			if(AERO.chess[color][chess]>56)AERO.chess[color][chess]=56-(AERO.chess[color][chess]-56);
			AERO.console("RECV:PLAYER " + color + " CHESS " + chess + " MOVE " + step + " TO " + AERO.chess[color][chess]);
			AERO.refreshChessboard();
			AERO.logicJudge(color, chess, step);
		},

		nextTurn : function() {
			if(AERO.turn == AERO.color){
				d.getElementById("turn").innerHTML = "YOUR TURN";
				if(AERO.win){
					d.getElementById("turn").innerHTML = "YOU WIN";
					AERO.socket.emit('skip', {color:AERO.color});
				}
			}else{
				d.getElementById("turn").innerHTML = "WAITING";
				//setTimeout(function(){d.getElementById("number").innerHTML = ""},1000);
			};
		},
	};

	d.getElementById("chat-input").onkeydown = function(e) {
		e = e || event;
		if (e.keyCode === 13) {
			AERO.chatSend();
		}
	};

	d.getElementById("send-button").onclick = function() {
		AERO.chatSend();
	};

	AERO.console("AEROPLANE CHESS");
	AERO.console("COPYRIGHT RIJN PIXELNFINITE.COM 2015");
	AERO.init();
	AERO.listen();

	var btnStatus = 0;

	d.getElementById("login-btn-next").onclick = function() {
		if(btnStatus == 0){
			AERO.getSetting();
			d.getElementById("color-section-box").style.display = "block";
			d.getElementById("username-box").setAttribute("disabled","disabled");	
		}
		if(btnStatus == 1){
			AERO.registerSubmit();
			d.getElementById("color-section-box").style.display = "none";
			d.getElementById("chess-board").style.display = "block";
		}
		btnStatus ++;
		//AERO.submit();
	};

	var element = getElementsByClassName(d, "color-button");

	for(i = 0; i < element.length; i++){
		element[i].setAttribute("classHistory", element[i].className);
		element[i].onclick = function() {
			for(j = 0; j < element.length; j++){
				if(element[j].className.indexOf("selected")<=0)element[j].className = element[j].getAttribute("classHistory");
			}
			this.className = this.className + " clicked"; 
		};
	}

	/*reset*/
	AERO.chess = new Array();
	for(i = 0; i < 4; i++){
		AERO.chess[i] = new Array();
		for(j = 0; j < 4; j++){
			AERO.chess[i][j] = -1;
		}
	}
	AERO.constPosition[-1] = {x:(169/970), y:(169/970)};
	AERO.constPosition[00] = {x:(38/970), y:(258/970)};
	AERO.constPosition[01] = {x:(77/970), y:(307/970)};
	AERO.constPosition[02] = {x:(144/970), y:(284/970)};
	AERO.constPosition[03] = {x:(200/970), y:(285/970)};
	AERO.constPosition[04] = {x:(261/970), y:(307/970)};
	AERO.constPosition[05] = {x:(309/970), y:(266/970)};
	AERO.constPosition[06] = {x:(286/970), y:(200/970)};
	AERO.constPosition[07] = {x:(286/970), y:(143/970)};
	AERO.constPosition[08] = {x:(309/970), y:(80/970)};
	AERO.constPosition[09] = {x:(374/970), y:(57/970)};
	AERO.constPosition[10] = {x:(430/970), y:(58/970)};
	AERO.constPosition[11] = {x:(486/970), y:(58/970)};
	AERO.constPosition[12] = {x:(542/970), y:(58/970)};
	AERO.constPosition[13] = {x:(599/970), y:(58/970)};
	AERO.constPosition[14] = {x:(659/970), y:(84/970)};
	AERO.constPosition[15] = {x:(685/970), y:(145/970)};
	AERO.constPosition[16] = {x:(686/970), y:(202/970)};
	AERO.constPosition[17] = {x:(660/970), y:(271/970)};
	AERO.constPosition[18] = {x:(702/970), y:(313/970)};
	AERO.constPosition[19] = {x:(771/970), y:(288/970)};
	AERO.constPosition[20] = {x:(827/970), y:(288/970)};
	AERO.constPosition[21] = {x:(891/970), y:(313/970)};
	AERO.constPosition[22] = {x:(913/970), y:(374/970)};
	AERO.constPosition[23] = {x:(913/970), y:(429/970)};
	AERO.constPosition[24] = {x:(913/970), y:(489/970)};
	AERO.constPosition[25] = {x:(913/970), y:(542/970)};
	AERO.constPosition[26] = {x:(913/970), y:(598/970)};
	AERO.constPosition[27] = {x:(891/970), y:(666/970)};
	AERO.constPosition[28] = {x:(826/970), y:(684/970)};
	AERO.constPosition[29] = {x:(770/970), y:(684/970)};
	AERO.constPosition[30] = {x:(707/970), y:(661/970)};
	AERO.constPosition[31] = {x:(660/970), y:(707/970)};
	AERO.constPosition[32] = {x:(685/970), y:(771/970)};
	AERO.constPosition[33] = {x:(685/970), y:(828/970)};
	AERO.constPosition[34] = {x:(664/970), y:(891/970)};
	AERO.constPosition[35] = {x:(598/970), y:(913/970)};
	AERO.constPosition[36] = {x:(540/970), y:(913/970)};
	AERO.constPosition[37] = {x:(484/970), y:(913/970)};
	AERO.constPosition[38] = {x:(429/970), y:(913/970)};
	AERO.constPosition[39] = {x:(373/970), y:(913/970)};
	AERO.constPosition[40] = {x:(309/970), y:(893/970)};
	AERO.constPosition[41] = {x:(286/970), y:(826/970)};
	AERO.constPosition[42] = {x:(286/970), y:(770/970)};
	AERO.constPosition[43] = {x:(309/970), y:(707/970)};
	AERO.constPosition[44] = {x:(261/970), y:(665/970)};
	AERO.constPosition[45] = {x:(201/970), y:(685/970)};
	AERO.constPosition[46] = {x:(144/970), y:(685/970)};
	AERO.constPosition[47] = {x:(83/970), y:(664/970)};
	AERO.constPosition[48] = {x:(57/970), y:(599/970)};
	AERO.constPosition[49] = {x:(57/970), y:(542/970)};
	AERO.constPosition[50] = {x:(57/970), y:(484/970)};
	AERO.constPosition[51] = {x:(148/970), y:(484/970)};
	AERO.constPosition[52] = {x:(203/970), y:(484/970)};
	AERO.constPosition[53] = {x:(260/970), y:(484/970)};
	AERO.constPosition[54] = {x:(316/970), y:(484/970)};
	AERO.constPosition[55] = {x:(371/970), y:(484/970)};
	AERO.constPosition[56] = {x:(428/970), y:(484/970)};

	w.onresize = function(){
		AERO.refreshClientSize();
		//console.log(AERO.clientlength);
		d.getElementById("chess-board").style.height = AERO.clientlength + "px";
		d.getElementById("chess-board").style.width = AERO.clientlength + "px";

		if(AERO.screenwidth<768){
			d.getElementById("control-panel").style.width = (AERO.screenwidth - 150) + "px";
			d.getElementById("chat-box").style.width = (AERO.screenwidth - 150) + "px";
			d.getElementById("chat-input").style.width = (AERO.screenwidth - 230) + "px";
		}

		var element = getElementsByClassName(d.getElementById("chess-board"), "chess");
		for(i = 0; i < element.length; i++){
			element[i].style.width = AERO.chesssize + "px";
			element[i].style.height = AERO.chesssize + "px";
			element[i].style.lineHeight = AERO.chesssize + "px";
			element[i].style.fontSize = AERO.chesssize*0.5 + "px";
			element[i].style.borderRadius = AERO.chesssize + "px";
		};
		AERO.refreshChessboard();
	};
	w.onresize();

	AERO.refreshChessboard();

	d.getElementById("test1").onclick = function() {
		AERO.nextStep(0,0,1);
	};

	d.getElementById("test2").onclick = function() {
		AERO.nextStep(1,0,1);
	};

	d.getElementById("test4").onclick = function() {
		AERO.nextStep(3,0,1);
	};


	d.getElementById("shake").onclick = function() {
		if(AERO.turn == AERO.color && !AERO.availablestep){
			AERO.availablestep = Math.floor(Math.random()*6+1);
			d.getElementById("number").innerHTML = AERO.availablestep;
			AERO.socket.emit('throw', {color:AERO.color, dice:AERO.availablestep, available:AERO.throwJudge(AERO.availablestep)});

			var temp = 1;
			if(AERO.color!=4 && AERO.availablestep!=6 && AERO.availablestep!=5){
				for(i=0;i<4;i++){
					if(AERO.chess[AERO.color][i]!=-1 && AERO.chess[AERO.color][i]!=56){
						temp = 0;
					}
				}
				if(temp) AERO.availablestep = 0;
			}				
		}

	};

	d.getElementById("reset-yes").onclick = function() {
		AERO.socket.emit('gameReset', {vote:1, color:AERO.color, result:1});
		d.getElementById("reset-overlay").style.display = "none";
	};

	d.getElementById("reset-no").onclick = function() {
		AERO.socket.emit('gameReset', {vote:1, color:AERO.color, result:0});
		d.getElementById("reset-overlay").style.display = "none";
	}
})();
