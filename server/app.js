/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'prod';

var express = require('express')
var config = require('./config/env');
var async = require('async')
var _ = require('underscore')
_.mixin(require('underscore.deep'))

var db = require('dynamodb').ddb({
  accessKeyId: config.keys.aws.key,
  secretAccessKey: config.keys.aws.keySecret
});

// setup server
var app = express();
var server = require('http').createServer(app)
app.set('server', server);
app.set('config', config);
require('./config/express')(app);

// setup web socket
// TODO can I do socket.listen before server is listening?
var io = require('socket.io').listen(server)
app.set('io', io);
require('./tweets')(app);

// start server 
require('./routes')(app);
server.listen(config.port, function() {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// TODO should only run when uploading to dynamo. move into separate script.
// buffer tweet stream to be uploaded to dynamo
/*
var tweets = [];
stream.on('tweet', function(tweet) {
  // add tweet to batch of tweets to be sent to db
  tweets.push(tweet);
})
*/

// util for formatting incoming tweets
var formatTweetsForDB = function(tweets) {
  // boss ass functional-style function to format tweets for our dynamoDB table
  return _.chain(tweets)
    // remove tweets that don't have required db indices: id_str and timestamp_ms.
    .filter(function(t) { 
      return (_.has(t,'id_str') && _.has(t,'timestamp_ms'))
    })
    .map(function(t) { 
      // adjust key names
      t.id = t.id_str
      t.user.id = t.user.id_str

      return _.chain(t)
      // flatten deeply-nested tweet object to single layer of keys.
      .deepToFlat()
      .pick(
        'id',
        'timestamp_ms',
        'text',
        'user.screen_name', 
        'user.id', 
        'user.follower_count', 
        'user.friend_count')
      // just in case: remove key-pairs with null or empty-string values.
      .invert().omit([null,'']).invert()
      .value();
    })
    .value();
}

var saveTweets = function() {
  // wait until the number of tweets in memory exceeds dynamo's maximum batch size
  if (tweets.length < 25) {
    setTimeout(saveTweets, saveTweetDelay.standard);
    return;
  }

  // split tweets into batches of 25 for bulk writing to dynamo
  var batches = [];
  while (tweets.length > 25) {
    batches.push(tweets.splice(0,25));
  }

  // async batch write to dynamo
  function upload(batch, callback) {
    console.log('batch size: ', batch.length);
    db.batchWriteItem(
      {'tweets': formatTweetsForDB(batch)}, {},
      function(err, res) {
        callback(err)
      });
  }

  async.map(batches, upload, function(err, results) {
    if (err) console.log('ERROR (db.batchWriteItem): ', err);
    // after uploads finish, reset save-tweets timeout
    setTimeout(saveTweets, err? saveTweetDelay.error : saveTweetDelay.standard);
  });
}
// begin calling saveTweets() intermittently
var saveTweetDelay = { error: 10000, standard: 1000 };
// TODO momentarily comment out 
// setTimeout(saveTweets, saveTweetDelay.standard);

// expose app
exports = module.exports = app;
