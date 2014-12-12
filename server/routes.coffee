###*
Main application routes
###
"use strict"
errors = require("./components/errors")
express = require("express")
module.exports = (app) ->
  
  # partials
  app.get "/partials/:name", (req, res) ->
    res.render app.get("appPath") + "/app/partials/" + req.params.name
  
  # styles
  app.use "/css", express.static(app.get("appPath") + "/app/css/")
  app.use "/js", express.static(app.get("appPath") + "/app/js/")
  app.use "/img", express.static(app.get("appPath") + "/app/img/")
  
  # update twitter stream word filter
  app.route("/filter/:words").post (req, res) ->
    app.get("twitter").updateFilter req.params.words
  
  # all undefined asset or api routes should return a 404
  app.route("/:url(api|auth|components|app|bower_components|assets)/*").get errors[404]
  
  # all other routes should redirect to the index.html
  app.route("/*").get (req, res) ->
      res.render app.get("appPath") + "/index"

  return
