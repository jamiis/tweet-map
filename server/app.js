/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';

var express = require('express')
var config = require('./config/env');

var _ = require('underscore')
_.mixin(require('underscore.deep'))

var db = require('dynamodb').ddb({
    accessKeyId: config.aws.accessKey,
    secretAccessKey: config.aws.accessKeySecret
});

// setup and auth twitter
var twit = require('twit')
var twitter = new twit({  
  consumer_key: config.twitter.consumerKey,
  consumer_secret: config.twitter.consumerSecret,
  access_token: config.twitter.accessToken,
  access_token_secret: config.twitter.accessTokenSecret
});

// setup server
var app = express();
var server = require('http').createServer(app)
require('./config/express')(app);
require('./routes')(app);

// start server
server.listen(config.port, function() {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// setup socket.io
var io = require('socket.io').listen(server);
var stream = twitter.stream('statuses/sample')

var formatTweetsForDB = function(tweets) {
  return _.chain(tweets)
    // remove tweets that don't have db indices: id and timestamp_ms.
    .filter(function(t) { 
      return !(_.has(t,'id') && _.has(t,'timestamp_ms'))
    })
    // flatten deeply-nested tweet object to single layer of keys.
    .deepToFlat()
    .pick(
      'id',
      'id_str',
      'timestamp_ms',
      'text',
      'user.screen_name', 
      'user.id_str', 
      'user.follower_count', 
      'user.friend_count')
    // just in case: remove key-pairs with null or empty-string values.
    .invert().omit([null,'']).invert()
    .value();
}

var tweets = [];
stream.on('tweet', function(tweet) {
  // add tweet to batch of tweets to be sent to db
  tweets.push(tweet);
  //socket.emit('tweet', { tweet: tweet});
})
  
var saveTweets = function() {
  console.log('saveTweets called');
  if (tweets.length > 0) {
    db.batchWriteItem({'tweets': formatTweetsForDB(tweets.slice(0,25))}, {},
      function(err, res) {
        if (err)
          console.log('BATCH WRITE ERROR: ', err);
        else {
          console.log('BATCH WRITE SUCCESS');
          //console.log('size of batch: ', tweets.length);
          console.log(res);
        }
        // reset list of tweets
        tweets = [];
    });
  }
  setTimeout(saveTweets, saveTweetDelay);
}
var saveTweetDelay = 500;
setTimeout(saveTweets, saveTweetDelay);

/* TODO momentarily comment out socket io logic
io.sockets.on('connection', function (socket) {  
  console.log('socket connection');
});
*/

// expose app
exports = module.exports = app;
