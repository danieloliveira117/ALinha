io = io.connect();

io.emit('ready', {room: roomtitle, user: username});

// atualiza sala quando entra um jogador
io.on('updateroom', function(room) {
	if(document.referrer != location.href) // evitar ping pong
	location.reload();
});

io.on('roomfull', function(room) {
	location.href = '/jogar';
});