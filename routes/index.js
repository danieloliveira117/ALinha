var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var users = require('../functions/users');
var rooms = require('../functions/rooms');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res)
{
	if (req.session.user == undefined){
		res.render('login', { title: 'Login', islogged: islogged(req)});
	} else {
		users.VerificarUtilizador(req.db, req.session.user, function(o){
			if (o != null){
				req.session.regenerate(function () {
					req.session.user = o.username;
					res.location("roomlist");
					res.redirect('/roomlist');
				});
			} else {
				if(req.session.user != undefined) {
					req.session.destroy();
				};
				res.location("login");
				res.render('login', { title: 'Login', islogged: islogged(req) });
			}
		});
	}
});

/* GET login */
router.get('/login', users.isNotAuthenticated, function(req, res)
{
	res.redirect('/');
});

/* GET logout */
router.get('/logout', users.isAuthenticated, function(req, res)
{
	if(req.session.user != undefined) {
		req.session.destroy();
	};
	res.redirect('/');
});

/* POST Login */
router.post('/login', function(req, res)
{
	var db = req.db;
	
	var userName = req.body.username;
	var userPassword = req.body.userpassword;
	
	var collection = db.get('usercollection');

	collection.findOne({"username":userName}, function(e, o) {
		if (o == null) {
			res.send('user-not-found');
		} else {
			bcrypt.compare(userPassword, o.password, function(err, res2) {
				if(res2 == true) {
					req.session.regenerate(function () {
						req.session.user = o.username;
						res.send('ok');
					});
				} else {
					res.send('wrongpassword');
				}
			});
		}
	});
});

/* GET Registar */
router.get('/registar', users.isNotAuthenticated, function(req, res)
{
	res.render('newuser', { title: 'Registar', islogged: islogged(req) });
});

/* GET Instruções */
router.get('/instrucoes', function(req, res)
{
	res.render('instrucoes', { title: 'Instruções', islogged: islogged(req) });
});

/* GET Create Room */
router.get('/createroom', users.isAuthenticated, function(req, res)
{
	res.render('createroom', { title: 'Criar Sala', islogged: islogged(req)});
});

router.get('/updateroom', users.isAuthenticated, function(req, res)
{
	res.send(rooms.roomlist);
});

/* POST Criar Sala */
router.post('/criarsala', users.isAuthenticated, function(req, res)
{
	// Obter dados da Sala
	var roomtitle = req.body.roomtitle;
	var maxplayers = req.body.maxplayers;
	var ok = true;
	
	for (var j = 0; j < rooms.roomlist.length; j++) {
		if(rooms.roomlist[j].roomtitle == roomtitle)
			ok = false;
	}
	if (ok) {
		// Preencher dados da sala
		var room1 = new rooms.room(roomtitle, maxplayers);
		
		// Preencher dados do jogador
		var member1 = new rooms.members(req.session.user, rooms.GetColor(room1));
		
		room1.members.push(member1);
		rooms.roomlist.push(room1);
		
		res.location("jogar");
		res.redirect('/sala');
	} else {
		res.redirect('/roomlist');
	}
});

/* POST Entrar Sala: Quando um jogador tenta entrar numa sala anteriormente criada */
router.post('/entrarsala', users.isAuthenticated, function(req,res) {
	var roomtitl = req.body.roomtitle;
	var ok = true, full = false;
	
	for (var i = 0; i < rooms.roomlist.length; i++) {	
		if (rooms.roomlist[i].roomtitle == roomtitl) { // Escolher Sala pelo titulo
			if (rooms.roomlist[i].members.length < rooms.roomlist[i].maxplayers) { // Verificar se a sala está cheia
				for (var j = 0; j < rooms.roomlist[i].members.length; j++) {
					if (rooms.roomlist[i].members[j].username == req.session.user)
						ok = false;
				}
				
				if (ok) { // Não adicionar se o jogador já se encontra na sala
					var member1 = new rooms.members(req.session.user, rooms.GetColor(rooms.roomlist[i]));
						
					rooms.roomlist[i].members.push(member1);
				}
			} else {
				full = true;
			}
		}
	}
	if (full) {
		res.redirect("/roomlist");
	} else {
		res.location("/sala");
		res.redirect('/sala');
	}
});

/* GET Sala de Jogo. */
router.get('/sala', users.isAuthenticated, function(req, res) {
	var room;
	
	for (var i = 0; i < rooms.roomlist.length; i++) {
		for (var j = 0; j < rooms.roomlist[i].members.length; j++) {
			if(rooms.roomlist[i].members[j].username == req.session.user) {
				room = rooms.roomlist[i];
			}
		}
	}
	
	/* Se o utilizador não estiver em sala nenhuma */
	if(room != null) 
		res.render('room', { title: "Jogar", room: room, username: req.session.user, islogged: islogged(req) });
	else
		res.redirect("/roomlist");
});

/* GET Room List */
router.get('/roomlist', users.isAuthenticated, function(req, res)
{
	res.render('roomlist', { title: 'Lista de Salas', roomlist: rooms.roomlist, islogged: islogged(req)});   
});

/* GET Sair Sala */
router.get('/sairsala', users.isAuthenticated, function(req, res)
{
	var i = -1;
	
	for (var j = 0; j < rooms.roomlist.length; j++) {
		for (var k = 0; k < rooms.roomlist[j].members.length; k++) {
			if(rooms.roomlist[j].members[k].username == req.session.user) {
				i = k;
			}
		}
		
		if (i > -1) {
	    	rooms.roomlist[j].members.splice(i, 1); // Remover jogador do array
	    	
	    	if(rooms.roomlist[j].members.length == 0) { // Apaga sala se não existirem jogadores
				rooms.roomlist.splice(j,1);
			}
		}
	}
	
	res.redirect("/roomlist");
});

/* POST Add User Service */
router.post('/adduser', function(req, res)
{
	// Set our internal DB variable
	var db = req.db;

	// Get our form values. These rely on the "name" attributes
	var userName = req.body.username;
	var userEmail = "";
	var userPassword = req.body.userpassword;

	// Set our collection
	var collection = db.get('usercollection');
	
	/* Verificar se já existe uma conta com o mesmo username */
	users.VerificarUtilizador(req.db, req.body.username, function(o) {
		if (o != null) {
			res.send("Já existe um utilizador com esse username.");
		} else {
			bcrypt.hash(userPassword, null, null, function(err, hash)
			{
				// Submit to the DB
				collection.insert({
					"username" : userName,
					"email" : userEmail,
					"password" : hash,
				}, function (err, doc) {
					if (err)
					{
						// If it failed, return error
						res.send("There was a problem adding the information to the database.");
					}
					else
					{
						// If it worked, set the header so the address bar doesn't still say /adduser
						res.location("login");
						// And forward to success page
						res.redirect("login");
					}
				});
			});
		}
	});
});

/* GET Jogar */
router.get('/jogar', users.isAuthenticated, function(req, res)
{
	var room = null;
	
	for (var i = 0; i < rooms.roomlist.length; i++) {
		for (var j = 0; j < rooms.roomlist[i].members.length; j++) {
			if(rooms.roomlist[i].members[j].username == req.session.user) {
				room = rooms.roomlist[i];
			}
		}
	}
	
	/* Se o utilizador não estiver em sala nenhuma */
	if(room != null) 
		res.render('play', { title: "Jogar", room: room, username: req.session.user, islogged: islogged(req) });
	else
		res.redirect("/roomlist");
});

function islogged(req) {
	if(req.session.user != undefined) {
		console.log('is logged');
		return true;
	}
	return false;
}

function GetRoomData(roomtitle) {
	for (var j = 0; j < rooms.roomlist.length; j++) {
		if(rooms.roomlist[j].roomtitle == roomtitle)
			return rooms.roomlist[j];
	}
	return null;
}


/* GET Room List */
router.get('/getroom', function(req, res)
{
	var room = GetRoomData(req.query.roomtitle);
	res.send(room);
});

module.exports = router;