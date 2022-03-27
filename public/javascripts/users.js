$(function() {
	$('#erro').hide();
	
	$("#btnSubmit").click(function() {
		$('.error').hide();
		
		var name = $("input#inputUserName").val();
		name = $.trim(name);
		
		var password = $("input#inputUserPassword").val();
		password = $.trim(password);
		
		var dataString = 'inputUserName='+ name + '&inputUserPassword=' + password;
		
	    if (name == "") {
	    	$('#erro').html("<b>Erro:</b> Têm de preencher o utilizador!");
	    	$("#erro").show();
	    	$("input#inputUserName").focus();
	    	return false;
	    }
	    
	   	if (password == "") {
	    	$('#erro').html("<b>Erro:</b> Têm de preencher a password!");
	    	$("#erro").show();
	    	$("input#inputUserPassword").focus();
	    	return false;
	    }
	    	    
		$.ajax({
			type: "POST",
			url: "/login",
			data: {username: name, userpassword: password},
			success: function(msg) {
				if(msg == 'ok') {
					location.href = '/roomlist';
				}
				else if(msg == 'user-not-found') {
					$('#erro').html("<b>Erro:</b> Utilizador não foi encontrado!");
					$('#erro').show();
				} else if(msg == 'wrongpassword') {
					$('#erro').html("<b>Erro:</b> Password Errada!");
					$('#erro').show();
				} else {
					$('#erro').html("<b>Erro:</b> Ocorreu um erro!");
					$('#erro').show();
				}
			}
		});
		return false;
	});
});