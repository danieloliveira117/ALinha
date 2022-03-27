//var roomlist
colors = new Array();
colors.push("#FF7F24"); // Laranja
colors.push("#EEC900"); // Amarelo
colors.push("#EDEDED"); // Branco
colors.push("#8E8E38"); // Verde Sujo
colors.push("#F08080"); // Rosa
colors.push("#00CDCD"); // Ciano
colors.push("#B23AEE"); // Roxo
colors.push("#2AC628"); // Verde
colors.push("#EA3030"); // Vermelho
colors.push("#3067EA"); // Azul

// Verifica se a cor se encontra em uso na sala
function UniqueColor(room, color) {
	for (var i = 0; i < room.members.length; i++) {
		if (room.members[i].color == color)
			return false;	
	}
	
	return true;
}

module.exports.GetUniqueColors = function(room) {
	var uniquecolors = new Array();
	
	for (var i = 0; i < colors.length; i++) {
		if (UniqueColor(room,colors[i])) 
			uniquecolors.push(colors[i]);
	}
	
	return uniquecolors;
}

module.exports.GetColor = function(room) {
	var color = null;
	
	/* Obter cor aleatória */
	while (color == null) {
		var randomnumber = Math.floor(Math.random()*11);
		
		// Verifica se a cor se encontra em uso na sala
		if (UniqueColor(room, colors[randomnumber]))
			color = colors[randomnumber];
	}
	
	return color;
}

module.exports.members = function(username, color) {
	this.username = username;
	this.socketid = null;
	this.color = color;
	this.ready = false;
}

/* Class: Room */
module.exports.room = function(roomtitle, maxplayers) {
	this.roomtitle = roomtitle;
	this.maxplayers = maxplayers;
	this.members = new Array();
}

module.exports.roomlist = new Array();