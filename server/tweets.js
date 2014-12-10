/**
 * Twitter connection handling
 */

'use strict';

// setup and auth twitter
var async = require('async'),
     twit = require('twit'),
   config = require('./config/env'),
        _ = require('underscore').mixin(require('underscore.deep')),
       db = require('dynamodb').ddb({
              accessKeyId: config.keys.aws.key,
              secretAccessKey: config.keys.aws.keySecret
            });

// tweets are saved to dynamo in batches which are pulled from this queue
var tweetsQueue = [];

// aws errors when rate limit exceed so delay is 10 seconds
var saveTweetDelay = { error: 10000, standard: 1000 };

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
        'user.friend_count',
        'coordinates.coordinates',
        'place')
      // just in case: remove key-pairs with null or empty-string values.
      .invert().omit([null,'']).invert()
      .value();
    })
    .value();
}

var saveTweets = function() {
  // wait until the number of tweets in the queue exceeds dynamo's maximum batch size
  if (tweetsQueue.length < 25) {
    setTimeout(saveTweets, saveTweetDelay.standard);
    return;
  }

  // split tweets into batches of 25 for bulk writing to dynamo
  var batches = [];
  while (tweetsQueue.length > 25) {
    batches.push(tweetsQueue.splice(0,25));
  }

  // async batch write to dynamo
  function upload(batch, callback) {
    console.log('batch size: ', batch.length);
    /*
    db.batchWriteItem(
      {'tweets': formatTweetsForDB(batch)}, {},
      function(err, res) {
        callback(err)
      });
      */
  }

  async.map(batches, upload, function(err, results) {
    if (err) console.log('ERROR (db.batchWriteItem): ', err);
    // after uploads finish, reset save-tweets timeout
    // TODO empty queue before saving tweets
    setTimeout(saveTweets, err? saveTweetDelay.error : saveTweetDelay.standard);
  });
}

module.exports = function(app) {
  // configure twit client
  var config = app.get('config');
  var twitt = new twit({
    consumer_key          : config.keys.twitter.key,
    consumer_secret       : config.keys.twitter.keySecret,
    access_token          : config.keys.twitter.token,
    access_token_secret   : config.keys.twitter.tokenSecret
  });

  // filter on the whole world;
  var filter = { locations: ['-180',-'90','180','90'] };
  //var filter = { track: 'will' };

  var twitter = {
    stream: twitt.stream('statuses/filter', filter),
    socket: null,
    listenForTweets: function() {
      // short circuit
      if (!twitter.socket) return;

      twitter.stream.on('tweet', function(tweet) {
        // ensure tweet has location
        if (_.property('coordinates')(tweet)) {
          tweetsQueue.push(tweet);
          if (config.env == 'dev') {
            //console.log('tweet', tweet);
          }
        }
      });
    },
    updateFilter: function(words) {
      // short circuit
      if (!twitter.socket || !twitter.stream) return;

      // new words filter based on previous stream filter
      var filter = twitter.stream.params;
      words ? filter.track = words: delete filter.track

      // create new stream object
      var newStream = twitt.stream('statuses/filter', filter);
      newStream.once('connected', function(res) {
        // stop old stream once the new stream has connected
        twitter.stream.stop();
        // start new filtered stream
        twitter.stream = newStream;
        twitter.listenForTweets();
      });
    }
  };

  // initiate socket connection
  app.get('io').sockets.on('connection', function (socket) {
    console.log('socket connected');
    // begin calling saveTweets() at regular intervals
    if (config.env == 'dev') {
      console.log('begin saving tweets to dynamo');
      setTimeout(saveTweets, saveTweetDelay.standard);
    }
    // set socket object on twitter object
    twitter.socket = socket;
    // start listening for tweets on twitter stream
    twitter.listenForTweets();
  });

  app.set('twitter', twitter);
};
