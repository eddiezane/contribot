#!/usr/bin/env node

/*
 * This file is used to intake the unique printfection urls
 * Usage: ./intake.js path/to/csv [mongodb://url]
 * Requires mongo://url argv or MONGO_URL env var
 */

var dotenv = require('dotenv').load();
var fs = require('fs');
var csv = require('csv');
var mongoose = require('mongoose');
var Code = require('./models/code.js');

mongoose.connect(process.env.MONGO_URL || process.env.argv[3]);

var file = fs.readFileSync(process.argv[2], {encoding: 'utf8'});

csv.parse(file, function(err, data) {
  if (err) console.error(err);

  var toSave = [];

  for (var i = 1; i < data.length; i++) {
    toSave.push({_id: data[i][1], used: false});
  }

  Code.create(toSave, function(err) {
    if (err) console.error(err);
    mongoose.disconnect();
  });
});

