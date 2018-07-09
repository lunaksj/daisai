const io = require('socket.io-client');

const socket = io("http://localhost:3000");

var stdin = process.openStdin();
var user;
var gameInfo;

stdin.addListener("data", function(d) {
   
	var command = d.toString().trim();
	switch(command)
	{
		case 'getGameInfo':
			console.log(gameInfo.name);
			socket.emit('getGameInfo', {
				name: gameInfo.name
			});
			break;
		case 'bet':
			socket.emit('bet', {
				name: gameInfo.name,
				betInfo: {
					odd:randomBet(),
					even:randomBet()
				}
			});
			break;
		default:
		 console.log("you entered: [" + command + "]");
		break;
	}
  });

socket.on('connect',()=>{
	console.log(socket.id);
	user = {
			name: makeRandomName(),
			sockId: socket.id
	}
	socket.emit('login', user);
});

socket.on('login', function(data){
	console.log("%s님이 입장하셨습니다.", data.name);
	if(user.name == data.name)
	{
		gameInfo = data;
		console.log("ㄴ나의id : %s, 나의 보유 칩: %d개", user.name, data.asset);
	}
});

socket.on('getGameInfo', function(data){
	console.log("정보조회");
	if(user.name == data.user.name)
	{
		gameInfo.user = data.user;
		console.log("ㄴ진행상태: %s, 나의id : %s, 나의 보유 칩: %d개, 나의베팅현황:", data.state, data.user.name, data.user.asset, data.betInfo);
	}
});

socket.on('bet', function(data) {
	if(user.name == data.user.name)
	{
		gameInfo.user = data.user;
		console.log(data);
	}
});

socket.on('rollDice', function(data) {
	if(user.name == data.user.name)
	{
		gameInfo.user = data.user;
		console.log(data);
	}
});

socket.on('gameState', function(data) {
	console.log(data);
});

function makeRandomName()
{
  var name = "";
  var possible = "abcdefghijklmnopqrstuvwxyz";
  for( var i = 0; i < 3; i++ ) {
	name += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return name;
}

function randomBet()
{
	var rand = Math.random();
	if(rand > 0.5)
		return 1;
	return 0;
}
