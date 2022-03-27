module.exports.VerificarUtilizador = function(db, user, callback) {
	var collection = db.get('usercollection');
	
	collection.findOne({username:user}, function(e, o) {
		if (o == null) {
			callback(null);
		} else {
			callback(o);
		}
	})
};

module.exports.isAuthenticated = function(req, res, next) {
	if(req.session.user != undefined)
		return next();

	res.redirect('/login');
}

module.exports.isNotAuthenticated = function(req, res, next) {
	if(req.session.user != undefined)
		res.redirect('/roomlist');
	
	return next();
}