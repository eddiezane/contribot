var express     = require('express');
var app         = express();
var server      = require('http').createServer(app);
var bodyParser  = require('body-parser');
var mongoose    = require('mongoose');
var request     = require('request');
var hbs         = require('hbs');
var ghSigVerify = require('./lib/github-sig-verify.js');
var ghRequests  = require('./lib/github-requests.js');
var Code        = require('./models/code.js');
var Contributor = require('./models/contributor.js');

if (app.get('env') === 'development') {
  require('dotenv').load();
}

mongoose.connect(process.env.MONGO_URL); 

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'hbs');
hbs.registerPartials(__dirname + '/views/partials');

app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.render('home', {github_client_id: process.env.GITHUB_CLIENT_ID});
});

// Inbound gh webook. TODO: Abstract and clean up
app.post('/webhooks/github', ghSigVerify, function(req, res) {
  // Only want pull requests
  if (req.header('X-Github-Event') !== 'pull_request') return res.end();

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
      console.error(err);
      return res.status(500).render('500');
    }

    var access_token = body.access_token;

    ghRequests.getUsername(access_token, function(err, resp) {
      if (err) {
        console.error(err);
        return res.status(500).render('500');
      }

      var user = resp.login;

      Contributor.findById(user, function(err, contributor) {
        if (err) {
          console.error(err);
          return res.status(500).render('500');
        }

        if (!contributor) {
          console.log('contributor not found during oauth', user);
          return res.redirect(302, '/go');
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
              console.error(err);
              return res.status(500).render('500');
            }

            pf_code.used = true;

            pf_code.save(function(err) {
              if (err) {
                console.error(err);
                return res.status(500).render('500');
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
  var access_token = req.query.access_token; // FIXME: Cookie this?

  Contributor.findOne({github_token: access_token}, function(err, contributor) {
    if (err) {
      console.error(err);
      return res.status(500).render('500');
    }

    if (!contributor) {
      console.log('no user was found for access_token', access_token);
      return res.status(500).render('500');
    }

    var statusCode = contributor.status_code;

    // They don't have a pf code yet
    if (statusCode !== 2 && statusCode !== 3) {
      return res.redirect(307, '/'); // TODO: Template
    }

    res.redirect(307, contributor._code); // TODO: Or die?
  });
});

app.get('/go', function(req, res) {
  res.render('go_contribute');
});

app.use(function(req, res, next) {
  res.status(404).render('404');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('500');
});

server.listen(app.get('port'), function() {
  console.log('Running on port %s', app.get('port'));
});
