###
Main application routes
###
"use strict"
errors = require "./components/errors"
express = require "express"
SNSClient = require "aws-snsclient"
bodyParser = require "body-parser"

module.exports = (app) ->
  
  config = app.get "config"

  # config middleware
  app.use bodyParser.json()
  app.use bodyParser.urlencoded extended:true

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

  snsClient = SNSClient { verify: false }, (err, message) ->
    console.log err if err
    console.log message unless err

  app.route("/receive").post(
    # use sns in production dev
    if config.env isnt "dev" then snsClient
    else (req, res) ->
      tweet = req.body
      #console.log tweet
      app.get("io").emit "tweet", tweet
      res.sendStatus 200
    )

  # all undefined asset or api routes should return a 404
  app.route("/:url(api|auth|components|app|bower_components|assets)/*").get errors[404]
  
  # all other routes should redirect to the index.html
  app.route("/*").get (req, res) ->
      res.render app.get("appPath") + "/index"

  return
