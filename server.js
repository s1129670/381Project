var express = require('express');
var app = express();
var mongoose = require('mongoose');
var assert = require('assert');
var http = require('http');
var session = require('cookie-session');
var ObjectId = require('mongodb').ObjectID;
//var MONGODBURL = 'mongodb://COMPS381F:381project@ds054128.mongolab.com:54128/MongoLab-2';
var mongourl = 'mongodb://user:user@ds050879.mlab.com:50879/ouhkcomp381project';
var restaurantSchema = require('./models/restaurants');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');

var urlencodedParser = bodyParser.urlencoded({ extended: true });

var returnObject = {
	'msg' : '',
	'code' : 0
}
var returnAPIObject = {
	'status' : ''
}
var errorObject = {
	'msg' : '',
	'code' : 0
};
var defaultObject = 
	{ 'address' : { 
		'building' : "",
		'coord' : [0, 0],
		'street' : "",
		'zipcode' : "" },
	  'borough' : "",
	  'cuisine' : "",
	  'grades' : [],
	  'name' : "",
	  'restaurant_id' : "",
    	  'restaurant_owner': ""};

app.use(express.static(__dirname + '/public'));
app.use( bodyParser.json() );
app.use(fileUpload());
app.use(session({
  name: 'session',
  keys: ['key1','key2']
}));
var modelObj = mongoose.model("restaurants", restaurantSchema);
var gradeSchema = mongoose.Schema({rateDate:Date, rateUser:String, restaurant_id:String,score:{type:Number, min:1, max:10}})
var modelObj2 = mongoose.model("grades", gradeSchema);
var userSchema = mongoose.Schema({
				username: String,
				password: String 
			});
var modelObj3 = mongoose.model("users", userSchema);

app.get('/', function(req,res) {
  	res.redirect('/showAllRestaurant');
});
app.set('view engine', 'ejs');
app.get('/showCreateAccountPage', function(req,res) {
  	res.render('CreateAC');
});
app.post('/createAccount',function(req,res) {
	var success = 0;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
		modelObj3.findOne(
			{'username' : req.body.username},
			{'_id' : 0},
			function (err, result){
				if (result != null){
					var errObject = errorObject;
					errObject.msg = 'The username have already existed!';
					errObject.code = 1;
					res.writeHead(404, {'Content-type' : 'application/JSON'});
					res.end(JSON.stringify(errObject));
					errObject = null;
					db.close();
				}else{
					var documentObj = new modelObj3(req.body);
					documentObj.save(
						function (err, result){
							if (err != null){
								var errObject = errorObject;
								errObject.msg = 'Fail to create Account!';
								errObject.code = 1;
								res.writeHead(404, {'Content-type' : 'application/JSON'});
								res.end(JSON.stringify(errObject));
								errObject = null;
							}else{
                              	res.redirect('/loginPage');
							}
							db.close();
						}
					);
				}
			}
		);
	});
});

app.get('/loginPage',function(req,res) {
  	res.render('Login');
});
app.post('/login',function(req,res) {
	var success = 0;
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	db.on('error', console.error.bind(console,'connection error'));
	db.once('open', function(callback) {
		modelObj3.findOne(
			{'username' : req.body.username},
			{'_id' : 0, '__v' : 0},
			function (err, result){
				if (result == null){
					var errObject = errorObject;
					errObject.msg = 'Auth. Fail';
					errObject.code = 11;
					res.writeHead(404, {'Content-type' : 'application/JSON'});
					res.end(JSON.stringify(errObject));
					errObject = null;
				}else if (JSON.stringify(req.body) != JSON.stringify(result)){
					var errObject = errorObject;
					errObject.msg = 'Auth. Fail';
					errObject.code = 12;
					res.writeHead(404, {'Content-type' : 'application/JSON'});
					res.end(JSON.stringify(errObject));
					errObject = null;
				}else{
					req.session.authenticated = true;
					req.session.username = req.body.username;
					res.redirect('/showAllRestaurant');
				}
				db.close();
			}
		);
	});
});
app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/showAllRestaurant');
});

app.post('/api/create', function(req,res) {
		if ((req.body.name == null) || (req.body.name == ' ')){
			var msg = 'Required Name fields missing!';
		}else if ((req.body.borough == null) || (req.body.borough == ' ')){
			var msg = 'Required Borough fields missing!';
		}else if ((req.body.cuisine == null) || (req.body.cuisine == ' ')){
			var msg = 'Required Cuisine fields missing!';
		}else if ((req.body.restaurant_id == null) || (req.body.restaurant_id == ' ')){
			var msg = 'Required Restaurant ID fields missing!';
		}
		if (msg != null){
			var errObject = errorObject;
			errObject.msg = msg;
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
		}else{
			var queryAsObject = req.body;

			var r = defaultObject;  // new restaurant to be inserted
			r.address.street = (queryAsObject.street != null) ? queryAsObject.street : null;
			r.address.zipcode = (queryAsObject.zipcode != null) ? queryAsObject.zipcode : null;
			r.address.building = (queryAsObject.building != null) ? queryAsObject.building : null;
			r.address['coord'] = [];
			if (queryAsObject.lon != null) {
				r.address.coord.push(queryAsObject.lon);
			}else{
				r.address.coord.push(0);
			}
			if (queryAsObject.lat != null) {
				r.address.coord.push(queryAsObject.lat);
			}else{
				r.address.coord.push(0);
			}
			r['borough'] = (queryAsObject.borough != null) ? queryAsObject.borough : null;
			r['cuisine'] = (queryAsObject.cuisine != null) ? queryAsObject.cuisine : null;
			r['name'] = (queryAsObject.name != null) ? queryAsObject.name : null;
			r['restaurant_id'] = (queryAsObject.restaurant_id != null) ? queryAsObject.restaurant_id : null;
			r['restaurant_owner'] = req.session.username;
			if (req.files) {
				r['photoUploaded'] = 1;
				r['photoData'] = new Buffer(req.files.uploadFile.data).toString('base64');
				r['photoDatatype'] = req.files.uploadFile.mimetype;
			}
					//

		
			mongoose.connect(mongourl);
			var db = mongoose.connection;
			db.on('error', console.error.bind(console,'connection error'));
			db.once('open', function(callback) {
				modelObj.find(
					{'restaurant_id' : req.body.restaurant_id},
					function (err, results){
						if (JSON.stringify(results) == '[]'){
							var documentObj = new modelObj(r);
							documentObj.save(function(error){
								if (error != null){
									var errObject = returnAPIObject;
									errObject.status = 'failed';
									res.writeHead(404, {'Content-type' : 'application/JSON'});
									res.end(JSON.stringify(errObject));
									errObject = null;
								}else{								
									var success = returnAPIObject;
									success.status = 'ok';
                                  	success._id = documentObj._id;
									res.writeHead(200, {'Content-type' : 'application/JSON'});
									res.end(JSON.stringify(success));
									success = null;
								}
								db.close();
							});
						}else{
							var errObject = errorObject;
							errObject.msg = 'Restaurant ID is already existed!';
							errObject.code = 12;
							res.writeHead(404, {'Content-type' : 'application/JSON'});
							res.end(JSON.stringify(errObject));
							db.close();
							errObject = null;
						}
					}
				);
			});
		}
	

});
app.get('/showCreateRestaurantPage', function(req,res){
  var a = req.session;
	if (JSON.stringify(a) == '{}'){
		res.redirect('/loginPage');
	}else{
		res.render('NewRes', {currentUser : a.username});
    }
});
app.post('/createRestaurant', function(req,res) {
	var a = req.session;
	if (JSON.stringify(a) == '{}'){
		res.redirect('/loginPage');
	}else{
      	console.log(req.body.name.length);
		if ((req.body.name == null) || (req.body.name.length == 0)){
			var msg = 'Required Name fields missing!';
		}else if ((req.body.borough == null) || (req.body.borough.length == 0)){
			var msg = 'Required Borough fields missing!';
		}else if ((req.body.cuisine == null) || (req.body.cuisine.length == 0)){
			var msg = 'Required Cuisine fields missing!';
		}
		if (msg != null){
			var errObject = errorObject;
			errObject.msg = msg;
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
		}else{
			var queryAsObject = req.body;

			var r = defaultObject;  // new restaurant to be inserted
			r.address.street = (queryAsObject.street != null) ? queryAsObject.street : null;
			r.address.zipcode = (queryAsObject.zipcode != null) ? queryAsObject.zipcode : null;
			r.address.building = (queryAsObject.building != null) ? queryAsObject.building : null;
			r.address['coord'] = [];
			if (queryAsObject.lon != null) {
				r.address.coord.push(queryAsObject.lon);
			}else{
				r.address.coord.push(0);
			}
			if (queryAsObject.lat != null) {
				r.address.coord.push(queryAsObject.lat);
			}else{
				r.address.coord.push(0);
			}
			r['borough'] = (queryAsObject.borough != null) ? queryAsObject.borough : null;
			r['cuisine'] = (queryAsObject.cuisine != null) ? queryAsObject.cuisine : null;
			r['name'] = (queryAsObject.name != null) ? queryAsObject.name : null;
			//r['restaurant_id'] = (queryAsObject.restaurant_id != null) ? queryAsObject.restaurant_id : null;
			r['restaurant_owner'] = req.session.username;
			if (req.files) {
				r['photoUploaded'] = 1;
				r['photoData'] = new Buffer(req.files.uploadFile.data).toString('base64');
				r['photoDatatype'] = req.files.uploadFile.mimetype;
			}
					//

		
			mongoose.connect(mongourl);
			var db = mongoose.connection;
			db.on('error', console.error.bind(console,'connection error'));
			db.once('open', function(callback) {
				modelObj.find(
					{'restaurant_id' : req.body.restaurant_id},
					function (err, results){
						if (JSON.stringify(results) == '[]'){
							var documentObj = new modelObj(r);
                          	documentObj.restaurant_id = documentObj._id.toString();
							documentObj.save(function(error){
								if (error != null){
			var errObject = errorObject;
									errObject.msg = 'Error occour while saving the new record! Detail = ' + error;
									errObject.code = 11;
									res.writeHead(404, {'Content-type' : 'application/JSON'});
									res.end(JSON.stringify(errObject));
									errObject = null;
								}else{				
                          				res.redirect('/showRestaurantInfo/' + documentObj._id.toString());
								}
								db.close();
							});
						}else{
			var errObject = errorObject;
									errObject.msg = 'Error occour while saving the new record! Detail = ' + error;
									errObject.code = 11;
									res.writeHead(404, {'Content-type' : 'application/JSON'});
									res.end(JSON.stringify(errObject));
									errObject = null;
								db.close();
						}
					}
				);
			});
		}
	}

});

app.post('/modifyRestaurantInfo', function(req,res) {
	var a = req.session;	
	if (JSON.stringify(a)== '{}'){
		res.redirect('/loginPage');
	}else{
		if ((req.body.name == null) || (req.body.name == ' ')){
			var msg = 'Required Name fields missing!';
		}else if ((req.body.borough == null) || (req.body.borough == ' ')){
			var msg = 'Required Borough fields missing!';
		}else if ((req.body.cuisine == null) || (req.body.cuisine == ' ')){
			var msg = 'Required Cuisine fields missing!';
		}else if ((req.body.restaurant_id == null) || (req.body.restaurant_id == ' ')){
			var msg = 'Required Restaurant ID fields missing!';
		}
		if (msg != null){
			
			var errObject = errorObject;
			errObject.msg = msg;
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
		}else{
			var queryAsObject = req.body;

			var r = defaultObject;  // new restaurant to be inserted
			r.address.street = (queryAsObject.street != null) ? queryAsObject.street : null;
			r.address.zipcode = (queryAsObject.zipcode != null) ? queryAsObject.zipcode : null;
			r.address.building = (queryAsObject.building != null) ? queryAsObject.building : null;
			r.address['coord'] = [];
			if (queryAsObject.lon != null) {
				r.address.coord.push(queryAsObject.lon);
			}else{
				r.address.coord.push(0);
			}
			if (queryAsObject.lat != null) {
				r.address.coord.push(queryAsObject.lat);
			}else{
				r.address.coord.push(0);
			}
			r['borough'] = (queryAsObject.borough != null) ? queryAsObject.borough : null;
			r['cuisine'] = (queryAsObject.cuisine != null) ? queryAsObject.cuisine : null;
			r['name'] = (queryAsObject.name != null) ? queryAsObject.name : null;
			r['restaurant_id'] = (queryAsObject.restaurant_id != null) ? queryAsObject.restaurant_id : null;
			r['restaurant_owner'] = req.session.username;
			if (req.files) {
				r['photoUploaded'] = 1;
				r['photoData'] = new Buffer(req.files.uploadFile.data).toString('base64');
				r['photoDatatype'] = req.files.uploadFile.mimetype;
			}
					//

		
			mongoose.connect(mongourl);
			var db = mongoose.connection;
			db.on('error', console.error.bind(console,'connection error'));
			db.once('open', function(callback) {
				modelObj.findOne(
					{'restaurant_id' : req.body.restaurant_id},
					function (err, results){
						if (results != null){
														
							if (results.restaurant_owner == req.session.username){
								var documentObj = new modelObj(r);
								modelObj.update(
									{restaurant_id : req.body.restaurant_id},
									{$set : r},
									function(error){
										if (error != null){
											var errObject = errorObject;
											errObject.msg = 'Error occour while changing the info. record!';
											errObject.code = 11;
											res.writeHead(404, {'Content-type' : 'application/JSON'});
											res.end(JSON.stringify(errObject));
											errObject = null;
										}else{								
											var success = returnObject;
											success.msg = 'Success changing new restaurant record';
											success.code = 0;
											res.writeHead(200, {'Content-type' : 'application/JSON'});
											res.end(JSON.stringify(success));
											success = null;
										}
										db.close();
									}
								);
							}else{
								var errObject = errorObject;
								errObject.msg = 'You are not the record owner of the restaurant!';
								errObject.code = 11;
								res.writeHead(404, {'Content-type' : 'application/JSON'});
								res.end(JSON.stringify(errObject));
								db.close();
								errObject = null;
							}
	
							
						}else{
							var errObject = errorObject;
							errObject.msg = 'Restaurant is NOT existed!';
							errObject.code = 12;
							res.writeHead(404, {'Content-type' : 'application/JSON'});
							res.end(JSON.stringify(errObject));
							db.close();
							errObject = null;
						}
					}
				);
			});
		}
	}
});
app.get('/showRatingPage/:v', function(req,res){
  	var cu = '';
    if (JSON.stringify(req.session) != '{}'){
      	cu = req.session.username;
    }
  	res.render('Rate', {
      	currentUser : cu,
      	restaurant_id : req.params.v
    });
});
app.post('/rateRestaurant', function(req,res) {
	var a = req.session;	
	if (JSON.stringify(a)== '{}'){
		res.redirect('/loginPage');
		
	}else{
		if ((req.body.restaurant_id == null) || (req.body.restaurant_id == ' ')){
			var msg = 'Required Restaurant ID fields missing!';
		}else if ((req.body.score == null) || (req.body.score == ' ')){
			var msg = 'Required Score fields missing!';
		}else if ((req.body.score > 10) || (req.body.score <= 0)){
			var msg = 'Required Score is out or range!';
		}
		if (msg != null){
			var errObject = errorObject;
			errObject.msg = msg;
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
		}else{
			
			mongoose.connect(mongourl);
			var db = mongoose.connection;
			db.on('error', console.error.bind(console,'connection error'));
			db.once('open', function(callback) {
				modelObj.findOne(
					{'restaurant_id' : req.body.restaurant_id},
					function (err, results){
						if (results != null){
							modelObj2.findOne(
                            	{'restaurant_id' : req.body.restaurant_id,
                              	'rateUser' : req.session.username},
                              	function (err, results){
                              		if (err != null){
										var errObject = errorObject;
										errObject.msg = 'Error occour while saving the restaurant record!';
										errObject.code = 11;
										res.writeHead(404, {'Content-type' : 'application/JSON'});
										res.end(JSON.stringify(errObject));
										errObject = null;
                                        db.close();
                                    }else if (results != null){
										var errObject = errorObject;
										errObject.msg = 'You have already rated for this restaurant before!';
										errObject.code = 11;
										res.writeHead(404, {'Content-type' : 'application/JSON'});
										res.end(JSON.stringify(errObject));
										errObject = null;
                                        db.close();
                                    }else{
                                      	var g = {'rateDate' : new Date(new Date().toISOString()), 'rateUser' : req.session.username, 'restaurant_id' : req.body.restaurant_id, 'score':req.body.score};  
                                        var documentObj = modelObj2(g);
                                        documentObj.save(
                                                function(error){
                                                    if (error != null){
                                                        var errObject = errorObject;
                                                        errObject.msg = 'Error occour while saving the restaurant rating record!';
                                                        errObject.code = 11;
                                                        res.writeHead(404, {'Content-type' : 'application/JSON'});
                                                        res.end(JSON.stringify(errObject));
                                                        errObject = null;
                                                    }else{								
                                                        res.redirect('/showRestaurantInfo/' + req.body.restaurant_id);
                                                    }
                                                    db.close();
                                                }
                                        );
                                    }
                              	}
                            );
						}else{
							var errObject = errorObject;
							errObject.msg = 'Restaurant is NOT existed!';
							errObject.code = 12;
							res.writeHead(404, {'Content-type' : 'application/JSON'});
							res.end(JSON.stringify(errObject));
							db.close();
							errObject = null;
						}
					}
				);
			});
		}
	}
});
app.get('/deleteRestaurant/:v', function(req,res) {
	var a = req.session;	
	if (JSON.stringify(a)== '{}'){
		res.redirect('/loginPage');
		
	}else{
      	var rid = req.params.v;
		if ((rid == null) || (rid == ' ')){
			var msg = 'Required Restaurant ID fields missing!';
		}
		if (msg != null){
			
			var errObject = errorObject;
			errObject.msg = msg;
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
		}else{
			mongoose.connect(mongourl);
			var db = mongoose.connection;
			db.on('error', console.error.bind(console,'connection error'));
			db.once('open', function(callback) {
				modelObj.findOne(
					{'restaurant_id' : rid},
					function (err, results){
						if (results != null){
														
							if (results.restaurant_owner == req.session.username){
								
								modelObj2.remove(
									{'restaurant_id' : rid},
									function(error){
										if (error != null){
											var errObject = errorObject;
											errObject.msg = 'Error occour while delete the rating record!';
											errObject.code = 11;
											res.writeHead(404, {'Content-type' : 'application/JSON'});
											res.end(JSON.stringify(errObject));
											errObject = null;
											db.close();
										}else{								
											modelObj.remove(
												{'restaurant_id' : rid},
												function(error){
													if (error != null){
														var errObject = errorObject;
														errObject.msg = 'Error occour while delete the info. record!';
														errObject.code = 11;
														res.writeHead(404, {'Content-type' : 'application/JSON'});
														res.end(JSON.stringify(errObject));
														errObject = null;
													}else{								
														res.redirect('/showAllRestaurant');
													}
													db.close();
												}
											);
										}
									}
								)
								
								
							}else{
								var errObject = errorObject;
								errObject.msg = 'You are not the record owner of the restaurant!';
								errObject.code = 11;
								res.writeHead(404, {'Content-type' : 'application/JSON'});
								res.end(JSON.stringify(errObject));
								db.close();
								errObject = null;
							}
						}else{
							var errObject = errorObject;
							errObject.msg = 'Restaurant is NOT existed!';
							errObject.code = 12;
							res.writeHead(404, {'Content-type' : 'application/JSON'});
							res.end(JSON.stringify(errObject));
							db.close();
							errObject = null;
						}
					}
				);
			});
		}
	}
});


app.get('/api/read/:a/:v', function(req,res) {
  	var regexp = require('node-regexp');

	var s = {};
  	var inp = req.params;
	if ((inp.a == 'borough') && (inp.v != null)){
		s.borough = inp.v; 
	}
	else if ((inp.a == 'cuisine') && (inp.v != null)){
		s.cuisine = inp.v; 
	}
	else if ((inp.a == 'name') && (inp.v != null)){	
		s.name = inp.v; 
	}
	else if ((inp.a == 'restaurant_id') && (inp.v != null)){
		s.restaurant_id = inp.v; 
	}
  
	if (JSON.stringify(s) == '{}'){
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(s));
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj.find(
				s,
				{_id : 0, __v : 0},
				function(error, results){
					if (error != null){
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify({}));
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify({}));
						db.close();
					}
					else{
						res.writeHead(200, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(results));
						db.close();
					}
				}
			);
		});
	}
});

app.get('/api/getRestaurantGrade/:v', function(req,res) {
  	var regexp = require('node-regexp');

	var s = {};
  	var inp = req.params;
	if (inp.v == null){
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(s));
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj2.find(
				s,
				{_id : 0, __v : 0},
				function(error, results){
					if (error != null){
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify({}));
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify({}));
						db.close();
					}
					else{
						res.writeHead(200, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(results));
						db.close();
					}
				}
			);
		});
	}
});

app.get('/showSearchRestaurantPage', function(req,res) {
  	var cu = '';
	if (JSON.stringify(req.session) != '{}'){
    	cu = req.session.username;
	}
  	res.render('Search', {currentUser : cu});
});
app.post('/searchRestaurantInfo', function(req,res) {
	if (JSON.stringify(req.body) == '{}'){
		var errObject = errorObject;
		errObject.msg = 'Search Criteria cannot be nothing!';
		errObject.code = 21;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
								errObject = null;
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
		var regexp = require('node-regexp');

			var s = {};
			if (req.body.borough != null){
				s.borough = { $regex: req.body.borough, $options: 'i' } 
			}
			if (req.body.cuisine != null){
				s.cuisine = { $regex: req.body.cuisine, $options: 'i' } 
			}
			if (req.body.name != null){	
				s.name =  { $regex: req.body.name, $options: 'i' } 
			}
			if (req.body.restaurant_id != null){
				s.restaurant_id = req.restaurant_id;
			}
			modelObj.find(
				s,
				{_id : 0, __v : 0},
				function(error, result){
					if (error != null){
						var errObject = errorObject;
						errObject.msg = 'Error occour while showing all the record! Detail = ' + error;
						errObject.code = 22;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else{
                        var cu = '';
                      	var resu = {};
                        if (JSON.stringify(req.session) != '{}'){
                                cu = req.session.username;
                        }
                   		if (JSON.stringify(result) != '[]'){
                          		resu = result;
                        }
						res.render('Result', {
                    		currentUser : cu,
                      		criteria : s,
                            results : resu
                        });
						db.close();
					}
				}
			);
		});
	}
});

app.get('/showAllRestaurant', function(req,res) {
	mongoose.connect(mongourl);
	var db = mongoose.connection;
	db.on('error', function(){
		var errObject = errorObject;
		errObject.msg = 'Cannot connect to database server!';
		errObject.code = 1;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
		errObject = null;
		db.close();
	});
	db.once('open', function(callback){
		modelObj.find(
         	{},
          	{_id : 0, __v : 0},
			function(error, result){
				if (error != null){
					var errObject = errorObject;
					errObject.msg = 'Error occour while showing all the record! Detail = ' + error;
					errObject.code = 22;
					res.writeHead(404, {'Content-type' : 'application/JSON'});
					res.end(JSON.stringify(errObject));
					errObject = null;
					db.close();
				}else{
                  	var cu = '';
                  	if (JSON.stringify(req.session) != '{}'){
                    		cu = req.session.username;
                    }
					res.render('Result', {
                    		currentUser : cu,
                      		criteria : {},
                            results : result
                    });
					db.close();
				}
            }
		);
	});
});
app.get('/showRestaurantInfo/:v', function(req,res) {
  	var inp = req.params;
	if (inp.v == ''){
		var errObject = errorObject;
		errObject.msg = 'Search Criteria cannot be nothing!';
		errObject.code = 21;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
								errObject = null;
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj.find(
              	{'restaurant_id' : inp.v},
				{_id : 0, __v : 0},
				function(error, results){
					if (error != null){
						var errObject = errorObject;
						errObject.msg = 'Error occour while showing all the record! Detail = ' + error;
						errObject.code = 22;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						var errObject = errorObject;
						errObject.msg = 'No search result.';
						errObject.code = 23;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}
					else{
                      modelObj2.find(
                          {'restaurant_id' : inp.v},
                          {_id : 0, __v : 0},
                          function(error, results2){
                                 if (error != null){
                                    var errObject = errorObject;
                                    errObject.msg = 'Error occour while showing all the record! Detail = ' + error;
                                    errObject.code = 22;
                                    res.writeHead(404, {'Content-type' : 'application/JSON'});
                                    res.end(JSON.stringify(errObject));
                                            errObject = null;
                                    db.close();
                                }else{
								var allowEdited = 0;
                            	var allowRated = 1;
                            	
                                var cu = '';
                  				if (JSON.stringify(req.session) == '{}'){
                                  	allowEdited = 0;
                                  	allowRated = 0;
                              	}else{
                                    cu = req.session.username;
                                    for (var grade in results2){
                                            if (grade.username == req.session.username){
                                                  allowRated = 0;
                                            }
                                        }
                                    }
                                    if  (results[0].restaurant_owner == req.session.username){
                                        allowEdited = 1;
                                    }
                                    res.render('View', {
										currentUser : cu,
                                        resPhoto : 'data:"'+ results[0].photoDatatype+'";base64,'+results[0].photoData,
                                        resID : results[0].restaurant_id,
                                        resOwner : results[0].restaurant_owner,
                                        resName : results[0].name,
                                        resBorough : results[0].borough,
                                        resCuisine : results[0].cuisine,
                                        resStreet : results[0].address.street,
                                        resBuilding : results[0].address.building,
                                        resCoord : results[0].address.coord,
                                        allowEdit : allowEdited,
                                        allowRate : allowRated,
                                        grades : results2
                                    });
                                }
                          		db.close();
                          	}
                     	);
					}
				}
			);
		});
	}
});

app.get('/showModifyRestaurantInfoPage/:v', function(req,res) {
  	var inp = req.params;
	if (inp.v == ''){
		var errObject = errorObject;
		errObject.msg = 'Search Criteria cannot be nothing!';
		errObject.code = 21;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
								errObject = null;
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj.find(
              	{'restaurant_id' : inp.v},
				{_id : 0, __v : 0},
				function(error, results){
					if (error != null){
						var errObject = errorObject;
						errObject.msg = 'Error occour while showing all the record! Detail = ' + error;
						errObject.code = 22;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						var errObject = errorObject;
						errObject.msg = 'No restaurant found.';
						errObject.code = 23;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (results[0].restaurant_owner != req.session.username){
						var errObject = errorObject;
						errObject.msg = 'You are not the owner of the restaurant record';
						errObject.code = 23;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
						errObject = null;
						db.close();
					}
					else{
                                    res.render('Edit', {
										currentUser : req.session.username,
                                        result : results
                                    });
                     	
							db.close();
					}
				}
			);
		});
	}
});

app.get('/showRestaurantPhoto/:restaurant_id', function(req,res) {
  	var inv = req.params;
	if (inv.restaurant_id == ''){
		var errObject = errorObject;
		errObject.msg = 'Please specific the restaurant ID!';
		errObject.code = 31;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
								errObject = null;
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
								errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj.findOne(
				{'restaurant_id' : inv.restaurant_id},
				{_id : 0},
				function(error, results){
					if (error != null){
						var errObject = errorObject;
						errObject.msg = 'Error occour while searching all the record! Detail = ' + error;
						errObject.code = 32;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						var errObject = errorObject;
						errObject.msg = 'No search result.';
						errObject.code = 33;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (results.photoUploaded == 0){
						var errObject = errorObject;
						errObject.msg = 'No photo is uploaded for the restaurant ' + results.name;
						errObject.code = 34;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else{
						res.set('content-type','text/html');
						res.write('<html><head><title>Photo of ' + results.name + '</title></head><body>');
						res.write('<div align="center">')
						res.write('<img src="data:'+
						results.photoDatatype+';base64,'+results.photoData+'" border="1" />');
						res.end('</div></body></html>');
						db.close();
					}
				}
			);
		});
	}
});


app.get('/displayRestaurantMap/:v', function(req,res) {
  	var inp = req.params;
	if ( inp.v == ''){
		var errObject = errorObject;
		errObject.msg = 'Please specific the restaurant ID!';
		errObject.code = 31;
		res.writeHead(404, {'Content-type' : 'application/JSON'});
		res.end(JSON.stringify(errObject));
		errObject = null;
	}else{
		mongoose.connect(mongourl);
		var db = mongoose.connection;
		db.on('error', function(){
			var errObject = errorObject;
			errObject.msg = 'Cannot connect to database server!';
			errObject.code = 1;
			res.writeHead(404, {'Content-type' : 'application/JSON'});
			res.end(JSON.stringify(errObject));
			errObject = null;
			db.close();
		});
		db.once('open', function(callback){
			modelObj.findOne(
              	{'restaurant_id' : inp.v},
				{_id : 0},
				function(error, results){
					if (error != null){
						var errObject = errorObject;
						errObject.msg = 'Error occour while searching all the record! Detail = ' + error;
						errObject.code = 32;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
						errObject = null;
						db.close();
					}else if (JSON.stringify(results) == '[]'){
						var errObject = errorObject;
						errObject.msg = 'No Restaurant Info.';
						errObject.code = 33;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else if (JSON.stringify(results.address.coord) == '[null,null]'){
						var errObject = errorObject;
						errObject.msg = 'No Restaurant Coord. Info.';
						errObject.code = 33;
						res.writeHead(404, {'Content-type' : 'application/JSON'});
						res.end(JSON.stringify(errObject));
								errObject = null;
						db.close();
					}else{
						res.writeHead(200, {'Content-type' : 'text/HTML'});
						res.write('<html><head><style type="text/css">\n');
						res.write('html, body { height: 100%; margin: 0; padding: 0; }\n');
      						res.write('#map { height: 100%; }\n');
						res.write('</style></head>\n<body><div id="map"></div>\n');
						res.write('<script>\n');
						res.write('var map;\n');
						res.write('function initMap() {\n');
						res.write('map = new google.maps.Map(document.getElementById("map"), {\n');
						res.write('center: {lat: ' + results.address.coord[1] + ', lng: ' + results.address.coord[0] + '},\n');
						res.write('zoom: 20\n');
						res.write('}\n);\n}</script>');
						res.end('<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCG0XVb6uIvXYhBrHMins7j8nwdeTFSzz8&callback=initMap"></script></body></html>');
						//res.redirect('https://www.google.com.hk/maps/@' + results.address.coord[0] + ',' + results.address.coord[1] + ',20z');
						db.close();
					}
				}
			);
		});
	}
});
app.listen(process.env.PORT || 8099)
