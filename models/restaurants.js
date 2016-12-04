var mongoose = require('mongoose');

var restaurantSchema = mongoose.Schema({
    address : {
        building: String,
        coord: [Number,Number],
        street: String,
        zipcode: String
        },
    borough: String,
    cuisine: String,
    name: String,
    restaurant_id: String,
    restaurant_owner:String,
    photoUploaded: {type: Number, max: 1, min: 0, default: 0},
    photoData: Buffer,
    photoDatatype:String    
});

module.exports = restaurantSchema;
