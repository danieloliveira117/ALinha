$(function() {
	if (pagativa == "jogar") 
		$('#jogarli').addClass("active");
	else if (pagativa == "instrucoes") 
		$('#instrucoesli').addClass("active");
	else if (pagativa == "login") 
		$('#loginli').addClass("active");
	else if (pagativa == "logout") 
		$('#logoutli').addClass("active");
	else if (pagativa == "registar") 
		$('#registoli').addClass("active");
});