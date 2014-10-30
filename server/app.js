/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';

var express = require('express')
var config = require('./config/env');
console.log(config);

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

io.sockets.on('connection', function (socket) {  
  console.log('socket connection');
  stream.on('tweet', function(tweet) {
    socket.emit('tweet', { tweet: tweet});
  });
});

// expose app
exports = module.exports = app;
