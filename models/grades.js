var mongoose = require('mongoose');

var gradeSchema = mongoose.Schema({
				rateDate: Date,
				rateUser: String,
				restaurant_id: String,
				score: {type: Number, max: 10, min: 1}
			});
