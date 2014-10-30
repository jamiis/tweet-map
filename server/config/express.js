/**
 * Express configuration
 */

'use strict';

var express = require('express');
var favicon = require('serve-favicon');
var path = require('path');
var config = require('./env');

module.exports = function(app) {
  var env = app.get('env');

  app.set('views', config.root + '/server/views');
  app.set('view engine', 'jade');
  
  if ('prod' === env) {
    /* TODO
    app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
    app.use(express.static(path.join(config.root, 'public')));
    app.set('appPath', config.root + '/public');
    */
  }

  if ('dev' === env || 'test' === env) {
    app.use(express.static(path.join(config.root, 'client')));
    app.set('appPath', 'client');
    // TODO app.use(errorHandler()); // Error handler - has to be last
  }
};
