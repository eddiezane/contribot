var mongoose = require('mongoose');

var contributorSchema = mongoose.Schema({
  _id: String,
  status_code: Number,
  _code : { type: String, ref: 'Code' },
  github_token: String
});

module.exports = mongoose.model('contributor', contributorSchema);

