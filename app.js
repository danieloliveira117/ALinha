var express = require('express.io');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var MemoryStore = session.MemoryStore,
    sessionStore = new MemoryStore();

//var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/nodetest1');

var routes = require('./routes/index');
var rooms = require('./functions/rooms');

var app = express();
app.http().io();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({store: sessionStore, secret: 'secret', key: 'express.sid'}));
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    next();
});

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/* -------------------------------------------------------*/
/* -----------------------SOCKET.IO-----------------------*/
/* -------------------------------------------------------*/

var jogos = new Array();

/* Opções Jogo */
var gvel = 10;  /* Velocidade Movimento */
var grot = 5; /* Velocidade Mudar Direcção */
var graio = 3; /* Tamanho */

// Classe Jogo
function Jogo(roomtitle, jogadores, maxpontos) {
	this.roomtitle = roomtitle;
	this.jogadores = jogadores;
	this.jogar = null;
	this.started = false;
	this.vel = gvel;
	this.rot = grot;
	this.raio = graio;
	this.maxpontos = maxpontos;
}

/* Calcular Número Aleatório entre 2 valores */
function getRandomInt(min,max)
{
	return Math.floor(Math.random()*(max-min+1)+min);
}

// Classe Jogador
function Jogador(username, cor, x, y) {
	this.x = x;
	this.y = y;
	this.angle = getRandomInt(0,360);
	this.raio = graio;
	this.username = username;
	this.cor = cor;
	this.coords = new Array();
	this.morto = false;
	this.pontos = 0;
	this.vencedor = null;
}

/* Classe Coordenadas */
function Coord(x,y,raio)
{
	this.x = x;
	this.y = y;
	this.raio = raio;
}

function ReplaceSocketID(socketid,username) {
	for (var j = 0; j < clientlist.length; j++) {
		if(clientlist[j].username == username)
			clientlist[j].socketid = socketid;
	}
}

function GetRoomData(roomtitle) {
	for (var j = 0; j < rooms.roomlist.length; j++) {
		if(rooms.roomlist[j].roomtitle == roomtitle)
			return rooms.roomlist[j];
	}
	return null;
}

function VerificarJogo(roomtitle) {
	var criado = false;
	
	for (var j = 0; j < jogos.length; j++) {
		if(jogos[j].roomtitle == roomtitle)
			criado = true;
	}
	return criado;
}

function CriarJogo(roomtitle) {
	room = GetRoomData(roomtitle);
	var jogadores = new Array();
	
	// criar jogadores
	for (var i = 0; i < room.members.length; i++) {
		var xx = null;
		var yy = null;
		
		do {
			xx = getRandomInt(100, 500-100); // canvas.width
			yy = getRandomInt(100, 450-100); // canvas.height
		} while(!LugarVazio(jogadores, xx, yy)); //até lugar livre

		jogadores.push(new Jogador(room.members[i].username, room.members[i].color, xx, yy));
	}
	
	jogo1 = new Jogo(roomtitle, jogadores, (jogadores.length-1)*10);
	jogos.push(jogo1);
}

function LugarVazio(jogadores, xx, yy) {
	jogadores.forEach(function(jog){
		if(CompararPosicoes(xx, yy, jog.x, jog.y))
			return false;
	});
	return true;
}

function SoUmVivo(jogadores) {
	var i = 0;
	for (var j = 0; j < jogadores.length; j++) {
		if(jogadores[j].morto == false) {
			i++;
			if (i>1)
				return false;
		}
	}
	return true;
}

function NewRound(jogo) {
	clearInterval(jogo.jogar);
	
	// Limpar Posições
	jogo.jogadores.forEach(function(jog){
		jog.x = 0;
		jog.y = 0;
	});
	
	/* Limpar Dados Jogador */
	jogo.jogadores.forEach(function(jog){
		var xx = null;
		var yy = null;
		
		do {
			xx = getRandomInt(100, 500-100); // canvas.width
			yy = getRandomInt(100, 450-100); // canvas.height
		} while (!LugarVazio(jogo.jogadores, xx, yy)); //até lugar livre

		jog.x = xx;
		jog.y = yy;
		jog.angle = getRandomInt(0,360);
		jog.coords = new Array();
		jog.morto = false;
	});
	
	setTimeout(function(){app.io.room(jogo.roomtitle).broadcast('newround', jogo.jogadores)}, 3000);
	setTimeout(function(){jogo.jogar = setInterval(function() {Mover(jogo);}, 30)}, 8000);
}

function AtribuirPontos(jogo, jog) {
	jogo.jogadores.forEach(function(jogador) {
		if(jogador != jog && jogador.morto == false) {
			jogador.pontos += 1;
		}
	});
	
	app.io.room(jogo.roomtitle).broadcast('updatepoints', jogo.jogadores);
}

function JogoAcabou(jogo) {
	var i = 0;
	var ven = null;
	jogo.jogadores.forEach(function(jogador) {
		if(jogador.pontos == jogo.maxpontos) {
			i++;
			ven = jogador.username;
		}
	});
	
	/* Verificar quantos jogadores ganharam */
	if(i==1) {
		jogo.vencedor = ven;
		return true;
	} else if(i>1) { // Se existir empate
		jogo.maxpontos += jogo.jogadores.lenght-1;
		app.io.room(jogo.roomtitle).broadcast('updatemaxpontos', {maxpontos: jogo.maxpontos}); 
		return false;
	} else {
		return false;
	}
}

function AcabarJogo(jogo) {
	if(jogo.started == true) {
		var i = jogos.indexOf(jogo);
		if (i > -1) {
			jogos[i].started = false;
		}
		
		console.log("Acabou jogo: " + jogo.roomtitle);
		app.io.room(jogo.roomtitle).broadcast('acabarjogo', jogo.vencedor);
		
		/* Apagar Sala */
		var i = rooms.roomlist.indexOf(GetRoomData(jogo.roomtitle));
		if (i > -1)
			rooms.roomlist.splice(i, 1);
			
		/* Apagar Sala Socket.IO e Lista de Clientes */
		var roster = app.io.sockets.clients(jogo.roomtitle);
		
		roster.forEach(function(client) {
			for(var i = 0; i < clientlist.length; i++) {
	        	if(clientlist[i].socketid === client.id) {
	        		clientlist.splice(i,1); // Remove Cliente Da lista
				}
	   		}
			client.leave(jogo.roomtitle);
		});
		
		/* Apagar Jogo */
		var i = jogos.indexOf(jogo);
		if (i > -1) {
			jogos.splice(i, 1);
		}
	}
}

function Mover(jogo) {
	jogo.jogadores.forEach(function(jog) {
		if(jog.morto == false) {
			// Mover
			jog.x += (jogo.vel/4) * Math.cos(Math.PI/180 * jog.angle);
			jog.y += (jogo.vel/4) * Math.sin(Math.PI/180 * jog.angle);
			
			if(VerificarLimites(jog.x, jog.y, jog.raio, 500, 450) || VerificarCoord(jogo, jog)){
				jog.morto = true;
				AtribuirPontos(jogo, jog);
				if(SoUmVivo(jogo.jogadores))
					if(JogoAcabou(jogo) == false)
						NewRound(jogo);
					else
						AcabarJogo(jogo);
			} else {
				// Guardar Coordenadas
				var coord = new Coord(jog.x, jog.y, jog.raio);
				jog.coords.push(coord);
			}
		}
	});
	
	// Enviar Coords
	app.io.room(jogo.roomtitle).broadcast('newcoords', jogo.jogadores);
}

/* Verificar impacto entre o jogador e as linhas existentes */
function VerificarCoord(jogo, jog)
{
	var morreu = false;
	// Verificar colisão com as outras linhas
	jogo.jogadores.forEach(function(jogador) {
		if(jogador != jog)
		{
			jogador.coords.forEach(function(coord) {
				if (VerificarColisao(jog, coord))
				{
					morreu = true;
				}
			});
		}
	});
	
	// Verificar colisão com a linha do próprio jogador
	for(var i = 0; i < (jog.coords.length-20); i++)
	{
		if (VerificarColisao(jog, jog.coords[i]))
		{
			morreu = true;
			break;
		}
	}

	return morreu;
}

/* Verificar se existe colisão entre 2 círculos */
function VerificarColisao(c1, c2)
{
	var dx = c1.x - c2.x;
	var dy = c1.y - c2.y;
	var dist = c1.raio + c2.raio;

	return (dx * dx + dy * dy <= dist * dist); // return true quando a distância dos raios <= a posição do circulo
}

/* Verificar se existe colisão entre 2 círculos */
function CompararPosicoes(x1, y1, x2, y2)
{
	var dx = x1 - x2;
	var dy = y1 - y2;
	var dist = 50 + 50; // 50 pixeis

	return (dx * dx + dy * dy <= dist * dist); // return true quando a distância dos raios <= a posição do circulo
}

/* Verificar impacto com a caixa */
function VerificarLimites(x,y,raio,width,height)
{
	if(x <= raio || x >= (width-raio))
	{
		return true;
	}

	if(y <= raio || y >= (height-raio))
	{
		return true;
	}

	return false;
}

app.io.route('turnleft', function(req) {
	jogos.forEach(function( sala ) {
		if (sala.roomtitle == req.data.room) {
			sala.jogadores.forEach(function(jog){
				if (jog.username == req.data.username) {
					jog.angle -= grot;
				}
			});
		}
	});
});

app.io.route('turnright', function(req) {
	jogos.forEach(function(jogo) {
		if (jogo.roomtitle == req.data.room) {
			jogo.jogadores.forEach(function(jog){
				if (jog.username == req.data.username)
					jog.angle += grot;
			});
		}
	});
});

app.io.route('startgame', function(req) {
	var jogo = null;
	
	jogos.forEach(function(jog) {
		if(jog.roomtitle == req.data.roomtitle) {
			jogo = jog;
		}
	});
	
	if(jogo.started == false) {
		jogo.started = true;
		console.log("Start Game: " + req.data.roomtitle);
		app.io.room(jogo.roomtitle).broadcast('updatemaxpontos', {maxpontos: jogo.maxpontos});
		app.io.room(jogo.roomtitle).broadcast('startgame', {jogo: jogo});
		
		// Iniciar Movimento
		setTimeout(function(){jogo.jogar = setInterval(function() {Mover(jogo);}, 30)}, 5000);
	}
});

app.io.route('ready', function(req) {
	var client = new Cliente(req.socket.id, req.data.user);
	req.socket.join(req.data.room);
	clientlist.push(client);
	
	var room = GetRoomData(req.data.room);
	
	if(room.maxplayers == room.members.length) {
		req.io.room(req.data.room).broadcast('updateroom')
		app.io.room(req.data.room).broadcast('roomfull', room); // Envia para todos os clientes na sala
		
		var roster = app.io.sockets.clients(req.data.room);
		
		roster.forEach(function(client) {
			for(var i = 0; i < clientlist.length; i++) {
	        	if(clientlist[i].socketid === client.id) {
	        		clientlist.splice(i,1); // Remove Cliente Da lista
				}
	   		}
			client.leave(req.data.room);
		});
	}
	else
		req.io.room(req.data.room).broadcast('updateroom');
});

/* Socket.IO Client */
var clientlist = new Array();
// Classe Cliente -> Relaciona Socket ID com username
function Cliente(socketid, username) {
	this.socketid = socketid;
	this.username = username;
}

/* Jogador entrou na sala */
app.io.sockets.on('connection', function(socket) {
	socket.on('readyplay', function(data) {
		
		room = GetRoomData(data.room);
		var reconnect = false;
		
		// Verificar se é reconeção
		clientlist.forEach(function(client) {
			if (client.username == data.user)
				reconnect = true;
		});
	
		if (reconnect) {
			clientlist.forEach(function(client) {
				if(client == data.user)
					client.leave(data.room);
			});
			socket.join(data.room); //Entrar na sala do Socket.IO
			ReplaceSocketID(socket.id, data.user); // Alterar Ligação entre ID e Username	
		}
		else {
			socket.join(data.room); // Entrar na sala do Socket.IO
			var client = new Cliente(socket.id, data.user);
			clientlist.push(client);
		}

		if(app.io.sockets.clients(room.roomtitle).length == room.maxplayers) {
			if (VerificarJogo(room.roomtitle) == false) {
				CriarJogo(room.roomtitle);
				app.io.room(data.room).broadcast('preparegame');
			}
		}		
	});
	
	/*socket.on('disconnect', function() {
		var username = null;
		
		for(var i = 0; i < clientlist.length; i++) {
	        if(clientlist[i].socketid === socket.id) {
	        	username = clientlist[i].username;
	        	clientlist.splice(i,1); // Remove Cliente Da lista
	        }
   		}
   		
   		if (username != null) {
   			var i = -1;
   			
			// Apaga membro da sala (registos do socket.io)
	   		for (var j = 0; j < rooms.roomlist.length; j++) {
				for (var k = 0; k < rooms.roomlist[j].members.length; k++) {
					if(rooms.roomlist[j].members[k].username == username) {
						socket.leave(rooms.roomlist[j].roomtitle);
					}
				}
			}
		}
	});*/
});
module.exports = app;