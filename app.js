var express     = require('express');
var app         = express();
var server      = require('http').createServer(app);
var bodyParser  = require('body-parser');
var mongoose    = require('mongoose');
var request     = require('request');
var dotenv      = require('dotenv').load();
var ghSigVerify = require('./lib/github-sig-verify.js');
var ghRequests  = require('./lib/github-requests.js');
var Code        = require('./models/code.js');
var Contributor = require('./models/contributor.js');

mongoose.connect(process.env.MONGO_URL); 

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'hjs');

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.render('index', {github_client_id: process.env.GITHUB_CLIENT_ID});
});

// Inbound gh webook. TODO: Abstract and clean up
app.post('/webhooks/github', ghSigVerify, function(req, res) {
  // Only want pull requests
  if (req.header('X-Github-Event') !== 'pull_request') res.end();

  // We're done with the request, return 200
  res.end();

  // Only want merged pr's
  if (!req.body.pull_request.merged) {
    return console.log('pr not merged');
  }

  // Something weird happened
  var username = req.body.pull_request.user.login;
  if (typeof username === 'undefined') {
    return console.log('username undefined');
  }

  var owner = req.body.repository.owner.login;
  var repo  = req.body.repository.name;

  // Check to see if the user is a collaborator of this repo
  ghRequests.getCollaborator(owner, repo, username, function(err, statusCode) {
    if (err) {
      return console.error(err);
    }

    // User is a collaborator
    if (statusCode == 204) {
      return console.log('user ' + username + ' is collab');
    }

    Contributor.findById(username, function(err, contributor) {
      if (err) {
        return console.error(err);
      }

      if (contributor) {
        return console.log('contributor exists');
      }

      // User is not in db
      Contributor.create({_id: username, status_code: 1}, function(err, newContributor) {
        if (err) {
          return console.error(err);
        }

        ghRequests.postComment(req.body.pull_request.comments_url, function(err, code) {
          if (err) {
            return console.error(err);
          }

          if (code == 201) console.log('comment posted');
        });
      });
    });
  });
});

app.get('/oauth/github', function(req, res) {
  var auth_code = req.query.code;
  ghRequests.postGithubOauth(auth_code, function(err, body) {
    if (err) {
      return console.error(err);
    }

    var access_token = body.access_token;

    ghRequests.getUsername(access_token, function(err, resp) {
      if (err) {
        return console.error(err);
      }

      var user = resp.login;

      Contributor.findById(user, function(err, contributor) {
        if (err) {
          return console.error(err);
        }

        if (!contributor) {
          return console.log('contributor not found during oauth');
        }

        // They don't belong here
        if (contributor.status_code !== 1) {
          // FIXME: Might we wrong http code
          return res.redirect(303, '/redeem?access_token=' + access_token);
        }

        Code.findOne({used: false}, function(err, pf_code) {
          contributor.github_token = access_token;
          contributor._code        = pf_code._id;
          contributor.status_code  = 2;

          contributor.save(function(err) {
            if (err) {
              return console.error(err);
            }

            pf_code.used = true;

            pf_code.save(function(err) {
              if (err) {
                return console.error(err);
              }

              return res.redirect(307, pf_code._id);
            });

          });
        });
      });
    });
  });
});

app.get('/redeem', function(req, res) {
  var access_token = req.query.access_token;
  Contributor.findOne({github_token: access_token}, function(err, contributor) {
    if (err) {
      console.error(err);
      res.send('bad');
    }

    var statusCode = contributor.status_code;
    if (statusCode !== 2 && statusCode !== 3) {
      return res.redirect(307, '/');
    }

    res.redirect(307, contributor._code);
  });
});


server.listen(app.get('port'), function() {
  console.log('Running on port %s', app.get('port'));
});
