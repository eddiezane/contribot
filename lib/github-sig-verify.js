/*
 * Express middleware to verify the GitHub hmac signature on webhooks
 */

var crypto = require('crypto');

module.exports = function(req, res, next) {
  if (req.header('Content-Type') !== 'application/json') return res.status(403).end();

  var signature = req.header('X-Hub-Signature');
  if (typeof signature === 'undefined') return res.status(403).end('signature not present');

  // verify the signature matches
  var body   = JSON.stringify(req.body);
  var secret = process.env.GITHUB_HMAC_SECRET;
  var sha1   = crypto.createHmac('sha1', secret)
                     .update(new Buffer(body, 'utf8'))
                     .digest('hex');
  var hash   = 'sha1=' + sha1;
  if (hash !== signature) return res.status(403).end('signature does not match');

  next();
}

