var app = require('express')();
var server = require('http').createServer(app);
// http server를 socket.io server로 upgrade한다
var io = require('socket.io')(server);

var userQueue = new Map();
var gameState;
// localhost:3000으로 서버에 접속하면 클라이언트로 index.html을 전송한다
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

// connection event handler
// connection이 수립되면 event handler function의 인자로 socket인 들어온다
io.on('connection', function(socket) {
  // 접속한 클라이언트의 정보가 수신되면
  socket.on('login', function(data) {
    console.log('Client logged-in:\n name:' + data.name+ ", id:"+data.sockId);

    // socket에 클라이언트 정보를 저장한다
    socket.name = data.name;
		socket.sockId = data.sockId;
    //socket.userid = data.userid;

    // 접속된 모든 클라이언트에게 메시지를 전송한다
		var user = {
			name: data.name,
			sockId: data.sockId,
			//sock: socket,
			asset: 50
		} 
		io.emit('login', user );
		userQueue.set(user.name, user);
		console.log(userQueue);
	});
	// force client disconnect from server
  socket.on('forceDisconnect', function() {
    socket.disconnect();
  })

  socket.on('disconnect', function() {
    console.log('user disconnected: ' + socket.name);
		userQueue.delete(socket.name);
		gameState.betInfo.delete(socket.name);
  });
  // 현재 자신의 자산 및 게임상태 조회
  socket.on('getGameInfo', function(data) {
	  console.log("getGameInfo");
		console.log(data);
	  
	  var user = userQueue.get(data.name);
	  var betInfo = gameState.betInfo.get(data.name);
	  var gameInfo = {
		  state : gameState.state,
		  betInfo: betInfo,
		  user: user
	  };
	  
	  console.log(gameInfo);
	  
	  socket.emit('getGameInfo', gameInfo);
  });
  socket.on('bet', function(data) {
	  console.log('bet');
	  var user = userQueue.get(data.name);
	  // 존재하지 않는 유저일 때 예외처리
	  if(undefined == user)
	  {
		  socket.emit('bet', {
				code: 98,
				message: data.name + " 유저가 존재하지 않는다.",
			});
			return;
	  }
		
	  // 상태에 따른 처리
	  switch(gameState.state) {
			case 'Betting' :
				var betInfo = data.betInfo;
				serverBet = gameState.betInfo.get(user.name);
				if (undefined == serverBet)
				{
					serverBet = {
						odd:0,
						even:0
					};
				}
				
				if(betInfo.odd + betInfo.even > user.asset)
				{
					socket.emit('bet', {
						code: 99,
						message: "칩이 부족하다",
						betInfo:serverBet,
						user:user
					});
					return;
				}
				
				serverBet.odd = serverBet.odd + betInfo.odd;
				serverBet.even = serverBet.even + betInfo.even;
				
				user.asset = user.asset - betInfo.odd - betInfo.even;
				userQueue.set(user.name, user);
				gameState.betInfo.set(user.name, serverBet);
				
				socket.emit('bet', {
					code: 100,
					message: "성공",
					betInfo:serverBet,
					user:user
				});
				
				console.log("%s 유저분이 홀:%d, 짝:%d 베팅.", user.name, betInfo.odd, betInfo.even);
				console.log("현재베팅상태:\n", gameState.betInfo);
				
				break;
			default :
				console.log("error");
				console.log(user);
				socket.emit('bet', {
					code: 97,
					message: "베팅불가",
					state: gameState.state,
					user:user
				});
				break;
			}
	 
  });
});

server.listen(3000, function() {
  console.log('Socket IO server listening on port 3000');
  gameState = {
	state:'Ready',
	betInfo: new Map()
  }
  changeState();
});

function changeState()
{
	switch(gameState.state){
		case 'Betting':
			gameState.state="RollDice";
			gameState.nextAction= setTimeout(changeState, 10000);

			msg = "베팅종료, 10초뒤 주사위 굴립니다.";
			console.log(msg);

			io.emit('gameState', {
				code: 100,
				message: msg,
				state: gameState.state,
				user:user
			});
			break;
		case 'RollDice':
			
			gameState.state="Ready";
			gameState.nextAction= setTimeout(changeState, 10000);

			var dice = rollDice();
			calcResult(dice);

			msg = "주사위 결과 정산,"+ dice +", 10초뒤 베팅시작";
			console.log(msg);

			io.emit('gameState', {
				code: 100,
				message: msg,
				state: gameState.state,
				user:user
			});
			break;
		case 'Ready':
			
			gameState.state="Betting";
			gameState.nextAction= setTimeout(changeState, 10000);

			msg = "베팅시작, 10초뒤 베팅이 종료됩니다.";
			console.log(msg);
			
			io.emit('gameState', {
				code: 100,
				message: msg,
				state: gameState.state,
				user:user
			});
			break;
		default:
			break;
	}
}

function rollDice()
{
	dice = Math.floor(Math.random()*6) + 1;
	console.log("dice is %d", dice);
	return dice;
}

function calcResult(dice)
{
	for (var [key, value] of gameState.betInfo) {
		message = {
			betInfo:{
				odd: value.odd,
				even: value.even
			},
			add:{
				odd:0,
				even:0,
				asset:0,
			},
			before:{
				asset:0
			},
			user:{}
		}
		
		user = userQueue.get(key);
		message.user = user;
		message.before.asset = user.asset;
		
		if(dice % 2 == 0)
		{
			if(value.even > 0)
			{				
				message.add.even = value.even * 2;
				message.add.asset += value.even * 2
				
				user.asset = user.asset + value.even * 2;
				userQueue.set(key, user);
				
				message.user = user;
			}
		}
		else
		{
			if(value.odd > 0)
			{
					message.add.odd = value.odd * 2;
					message.add.asset += value.odd * 2
					
					user.asset = user.asset + value.odd * 2;
					userQueue.set(key, user);
					
					message.user = user;
			}
		}
		
		io.to(user.sockId).emit('rollDice', message);
	}
	gameState.betInfo.clear();
}

