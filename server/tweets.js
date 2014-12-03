/**
 * Twitter connection handling
 */

'use strict';

// setup and auth twitter
var twit = require('twit');
var _ = require('underscore')
_.mixin(require('underscore.deep'))

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
          var tweet = {
            lat     : tweet.coordinates.coordinates[0],
            lng     : tweet.coordinates.coordinates[1],
            title   : tweet.text,
            id      : tweet.id
          };
          twitter.socket.emit('tweet', tweet);
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
    // set socket object on twitter object
    twitter.socket = socket;
    // start listening for tweets on twitter stream
    twitter.listenForTweets();
  });

  app.set('twitter', twitter);
};
