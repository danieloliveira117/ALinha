io = io.connect();

// Registar Jogador na Sala
io.emit('readyplay', {room: roomtitle, user: username});

var room = null,
	mover = null,
	raio = 0,
	keys = new Array(),
	jogadores = new Array();

/* ---- Pré-Jogo ---- */
$(function() { // <-- document.load 
	canvas = document.getElementById("canvas");
	canvas2 = document.getElementById("canvas2");
	context = canvas.getContext("2d");
	context2 = canvas2.getContext("2d");

	/* Mostrar Mensagem */
	MostrarMensagem("À espera dos jogadores!", false);
	
	$.get( '/getroom', {roomtitle: roomtitle}, function(data) {
		room = data; // Guardar Sala
		jogadores = room.members; // Guardar Membros da sala
	});
});

io.on('preparegame', function() {
	io.emit('startgame', {roomtitle: roomtitle});
});

io.on('startgame', function(jogo) {
	/* Preparar Jogo */
	raio = jogo.raio; // Guardar Tamanho para desenhar
	NewRound();
});

io.on('newround', function(jog) {
	jogadores = jog; // Receber dados iniciais jogadores
	NewRound();
});

io.on('acabarjogo', function(vencedor) {
	MostrarMensagem('Parabéns! Ganhaste ' + vencedor + '!', false);
	setTimeout(function() {location.href = '/roomlist';}, 5000);
});

io.on('updatepoints', function(jog) {
	jog.forEach(function(jogador) { 
		$( "#"+ jogador.username +"pontos" ).html( jogador.pontos );
	});
});

io.on('updatemaxpontos', function(data) {
	$( "#maxpontos" ).html( "<b>Objetivo:</b> "+data.maxpontos+" pontos" );
});

function NewRound() {
	// Limpar Campo
	context.clearRect(0, 0, canvas.width, canvas.height);
	
	// Reiniciar Variáveis
	jogador = new Jogador(username, 37,39);
	window.clearInterval(mover);
	
	for (var j = 0; j < jogadores.length; j++) {
		if(username == jogadores[j].username) {
			jogador.num = j;
		}
	}
	
	CountDown(function() {IniciarJogo();});
}

function CountDown(callback) {
	MostrarMensagem("5", true);
	window.setTimeout(function(){MostrarMensagem("4", true)}, 1000);
	window.setTimeout(function(){MostrarMensagem("3", true)}, 2000);
	window.setTimeout(function(){MostrarMensagem("2", true)}, 3000);
	window.setTimeout(function(){MostrarMensagem("1", true)}, 4000);
	window.setTimeout(function(){callback();}, 5000);
};

function MostrarMensagem(msg, clear) {
	if (clear)
	context2.clearRect(0, 0, canvas.width, canvas.height);

	context2.font = '30pt Calibri';
	context2.textAlign = 'center';
	context2.fillStyle = '#d3d3d3';
	context2.fillText(msg, canvas.width / 2, canvas.height / 2);
}

function Jogador(username,e, d) {
	this.num = null;
	this.username = username;
	this.e = e;
	this.d = d;
}

/* Classe Coordenadas */
function Coord(x,y,numj) {
	this.x = x;
	this.y = y;
	this.numj = numj;
}

/* --- Jogar --- */
function IniciarJogo() {
	console.log("Iniciar Jogo");
	context.clearRect(0, 0, canvas.width, canvas.height);
	context2.clearRect(0, 0, canvas2.width, canvas2.height);
	mover = setInterval(function() {Mover(jogador);}, 30); // Mover jogador deste computador
}

/* Desenhar */
io.on('newcoords', function(jogadores) {
    for (var j = 0; j < jogadores.length; j++) {
   		if(jogadores[j].morto == false)
    		Desenhar(jogadores[j].x,jogadores[j].y,jogadores[j].raio,jogadores[j].cor);
    }
});

function Desenhar(x,y,raio,cor) {
	context.beginPath();
	context.arc(x,y,raio,0*Math.PI,2*Math.PI);
	context.fillStyle = cor;
	context.fill();
	context.closePath();
}

/* --- Mover Jogador --- */
function Mover(jogador) {
	if (jogador.e in keys && keys[jogador.e]){ // Esquerda
		io.emit('turnleft', {room: roomtitle, username: username})
	}
	if (jogador.d in keys && keys[jogador.d]){ // Direita
		io.emit('turnright', {room: roomtitle, username: username})
	}
}

// Evento tecla pressionada
function doKeyDown(evt){
	keys[evt.keyCode] = true;
}

function doKeyUp(evt){
	keys[evt.keyCode] = false;
}

window.addEventListener('keydown',doKeyDown,true);
window.addEventListener('keyup',doKeyUp,true);
