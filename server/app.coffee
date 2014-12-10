###*
Main application file
###
"use strict"

# set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV or "prod"
cluster = require("cluster")
config = require("./config/env")
_ = require("underscore")
if cluster.isMaster
  
  # ... cluster management ... //
  workers = {}
  cpus = require("os").cpus().length
  spawn = ->
    worker = cluster.fork()
    workers[worker.pid] = worker
    worker

  # spawn 1 worker per cpu
  # TODO -1?
  _.each _.range(cpus), spawn
  
  # respawn worker on death
  cluster.on "death", (worker) ->
    console.log "worker " + worker.pid + " died. spawning a new process..."
    delete workers[worker.pid]

    spawn()
    return

  
  # ... server setup ... //
  express = require("express")
  app = express()
  server = require("http").createServer(app)
  app.set "server", server
  app.set "config", config
  require("./config/express") app
  
  # setup web socket
  io = require("socket.io").listen(server)
  app.set "io", io
  require("./tweets") app
  
  # start server 
  require("./routes") app
  server.listen config.port, ->
    console.log "server listening on %d, in %s mode", config.port, app.get("env")
    return

  
  # expose app
  exports = module.exports = app
else
  console.log "worker process started"
  
  # ... worker process ... //
  aws = require("aws-sdk")
  _.extend aws.config,
    region: "us-east-1"
    accessKeyId: config.keys.aws.key
    secretAccessKey: config.keys.aws.keySecret

  sqs = new aws.SQS()
  sns = new aws.SNS()
  
  # begin polling sqs for tweets
  (pollSqs = ->
    receiveOpts =
      QueueUrl: config.urls.sqs.tweetMap
      WaitTimeSeconds: 20 # max = 20 seconds

    sqs.receiveMessage receiveOpts, (err, data) ->
      console.log "rec msg"
      if err
        console.log "error receiving sqs msg", err, err.stack
      else
        if _.has(data, "Messages")
          msgs = data.Messages
          console.log "success. num message: ", msgs.length
          
          # foreach message received ...
          _.each data.Messages, (msg) ->
            console.log "msg: ", msg
            
            # TODO get sentiment from alchemy api
            
            # delete message from queue
            deleteOpts =
              QueueUrl: config.urls.sqs.tweetMap
              ReceiptHandle: msg.ReceiptHandle

            sqs.deleteMessage deleteOpts, (err, data) ->
              if err
                console.log "error deleting sqs msg ", err, err.stack
              else # TODO should be moved inside alchemy api callback
                pollSqs()
              return

            return

        
        # no messages in queue, long poll again
        else
          pollSqs()
      return

    return
  )()
