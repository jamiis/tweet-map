/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';

var express = require('express')
var config = require('./config/env');
var async = require('async')
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

// setup web socket
var io = require('socket.io').listen(server);
var stream = twitter.stream('statuses/filter', {
  // filter on the whole world
  locations: ['-180',-'90','180','90']
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

io.sockets.on('connection', function (socket) {  
  console.log('socket connected');
  stream.on('tweet', function(tweet) {
    // ensure tweet has location
    if (_.property('coordinates')(tweet)) {
      //var point = {"lat": tweet.coordinates.coordinates[0],"lng": tweet.coordinates.coordinates[1]};

      // TODO
      //socket.emit('tweet', { tweet: tweet});
      //socket.broadcast.emit("twitter-stream", outputPoint);

      // send out to web sockets channel.
      // push tweets to members of subscribed channels
      //socket.emit('twitter-stream', outputPoint);
      socket.emit('tweet', tweet);
    }
    /*
    if (stream === null) {
      //Connect to twitter stream passing in filter for entire world.
      twit.stream('statuses/filter', {'locations':'-180,-90,180,90'}, function(s) {
        stream = s;
        stream.on('data', function(data) {
        });
      });
    });
    */
  });
});
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
