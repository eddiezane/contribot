var express     = require('express');
var app         = express();
var server      = require('http').createServer(app);
var bodyParser  = require('body-parser');
var mongoose    = require('mongoose');
var dotenv      = require('dotenv').load();
var ghSigVerify = require('./lib/github-sig-verify.js');
var Code        = require('./models/code.js');
var Contributor = require('./models/contributor.js');

mongoose.connect(process.env.MONGO_URL); 

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.send('Hello');
});

// app.post('/webhooks/github', ghSigVerify, function(req, res) {
app.post('/webhooks/github', function(req, res) {
  // Only want pull requests
  // if (req.header('X-Github-Event') !== 'pull_request') res.end();

  // We're done with the request, return 200
  res.end();

  // Only want merged pr's
  if (!req.body.pull_request.merged) return;

  // TODO: Logger. Something weird happened
  var username = req.body.pull_request.user.login;
  if (typeof username === 'undefined') return;

  Contributor.findById(username, function(err, contributor) {
    if (err) console.error(err);

    if (contributor) return;

    Contributor.create({_id: username, status_code: 1}, function(err, newContributor) {
      if (err) console.error(err);

      // TODO: Reply to PR and ask them to login and oauth 
    });
  });
});

server.listen(app.get('port'), function() {
  console.log('Running on port %s', app.get('port'));
});
