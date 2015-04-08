var mongoose = require('mongoose');

var codeSchema = mongoose.Schema({
  _id: String,
  used: Boolean
});

module.exports = mongoose.model('code', codeSchema);

