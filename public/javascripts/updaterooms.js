$(function() {
	Actualizar();
	setInterval(function() {Actualizar();}, 5000);
});

function Actualizar() {
	$.get( '/updateroom', function(rooms) {
		if (rooms.length > 0) {
			$('#listadesalas').empty();
			$.each(rooms, function(i, room) {
				$('#listadesalas').append(
					'<tr>' +
					'<td class="text-center">' +room.roomtitle+ '</td>' +
					'<td class="text-center">' +room.members.length+ ' / ' + room.maxplayers + '</td>' +
					'<td class="text-center">' +
					'<form role="form" name="entrarsala_'+ room.roomtitle +'" method="post" action="/entrarsala">' +
					'<input type="hidden" name="roomtitle" value="'+ room.roomtitle +'")' + '</input>' +
					'<button type="submit" class="btn btn-sm btn-success">' +
					'<i class="glyphicon glyphicon-log-in"> <b>Entrar</b></i></button></form>' +
					'</td></tr>'
				);
			});
		} // if rooms > 0
		else {
			$('#listadesalas').empty();
			$('#listadesalas').append('<tr><td colspan="4">N&atilde;o existem salas de jogo criadas!</td></tr>');
		}
	});
}