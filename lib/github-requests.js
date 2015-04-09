var request = require('request');
var GH_ROOT = 'https://api.github.com';
var GH_TOKEN = process.env.GITHUB_USER_TOKEN;

var GH_MESSAGE = {
  body: "Thanks for contributing to SendGrid Open Source! We think it's awesome when community members contribute to our projects and want to celebrate that.\n\nThe following link will ask you to authenticate with Github (so we can verify your identity). You'll then be asked for your shipping address so that we can send you a thanks for contributing.\n\n[Click Here to Continue »](https://sendgrid-contribot.herokuapp.com/)\n\nOnce again, thank you!"
};

module.exports = {
  // Check if user is a collaborator of the repo
  getCollaborator: function(owner, repo, user, callback) {
    request.get({
      url: GH_ROOT + '/repos/' + owner + '/' + repo + '/collaborators/' + user + '?access_token=' + GH_TOKEN,
      headers: {
        'User-Agent': 'eddiezane/contribot'
      }},
      function(err, req, body) {
      callback(err, req.statusCode);
    });
  },

  // Post redeem comment to pr thread
  postComment: function(commentUrl, callback) {
    request.post({
      url: commentUrl,
      headers: {
        Authorization: 'token ' + GH_TOKEN,
        'User-Agent': 'eddiezane/contribot'
      },
      json: true,
      body: GH_MESSAGE
    }, function(err, res, body) {
      callback(err, res.statusCode);
    });
  },

    // Get username associated with token
  getUsername: function(token, callback) {
    request.get({
      url: GH_ROOT + '/user?access_token=' + GH_TOKEN,
      json: true,
      headers: {
        'User-Agent': 'eddiezane/contribot',
        'Accept': 'application/json'
      }},
      function(err, req, body) {
        callback(err, body);
      }); 
  },

  postGithubOauth: function(auth_code, callback) {
    request.post({
      url: 'https://github.com/login/oauth/access_token',
      json: true,
      headers: {
        'User-Agent': 'eddiezane/contribot',
        'Accept': 'application/json'
      },
      form: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: auth_code
      }
    },
    function(err, resp, body) {
      callback(err, body);
    });
  }

}

