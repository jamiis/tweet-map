/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';

var express = require('express')
var config = require('./config/env');

// setup server
var app = express();
var server = require('http').createServer(app)
require('./config/express')(app);
require('./routes')(app);

// start server
server.listen(config.port, function() {
  console.log('Express server listening on %d, in %s mode', config.port, app.get('env'));
});

// expose app
exports = module.exports = app;
