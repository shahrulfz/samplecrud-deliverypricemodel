//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;

var SomeModelSchema = new Schema({
    productType: String,
    deliveryDay: String,
    nameDescription: String,
    price: String,
    bulk_discount: [{
        month_units_minimum: String,
        discount: String,
    }]
});

var SomeModel = mongoose.model('sampleFee', SomeModelSchema);
module.exports = SomeModel;