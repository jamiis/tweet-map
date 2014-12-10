###*
Express configuration
###
"use strict"
express = require("express")
favicon = require("serve-favicon")
path = require("path")
config = require("./env")
module.exports = (app) ->
  env = app.get("env")
  app.set "views", config.root + "/server/views"
  app.set "view engine", "jade"
  app.use express.static(path.join(config.root, "client"))
  app.set "appPath", config.root + "/client"
  return

#
#  if ('prod' === env) {
#    // TODO app.use(favicon(path.join(config.root, 'public', 'favicon.ico')));
#  }
#
#  if ('dev' === env) {
#    // TODO app.use(errorHandler()); // Error handler - has to be last
#  }
#  
