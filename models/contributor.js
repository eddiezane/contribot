var mongoose = require('mongoose');

var contributorSchema = mongoose.Schema({
  _id: String,
  status_code: Number,
  _code : { type: mongoose.Schema.ObjectId, ref: 'Code' }
});

module.exports = mongoose.model('contributor', contributorSchema);

