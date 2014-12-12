###*
Main application file
###
"use strict"

# set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV or "prod"
cluster = require "cluster"
config = require "./config/env"
http = require "http"
alchemy = new (require "alchemy-api") config.keys.alchemy.key
_ = require "underscore"

aws = require "aws-sdk"
_.extend aws.config,
  region: "us-east-1"
  accessKeyId: config.keys.aws.key
  secretAccessKey: config.keys.aws.keySecret


# ... master manages cluster workers and handles incoming requests ... //
if cluster.isMaster
  
  workers = {}
  cpus = require("os").cpus().length
  spawn = ->
    worker = cluster.fork()
    workers[worker.pid] = worker
    worker

  # spawn 1 worker per available cpu
  spawn() for cpu in [1..cpus-1]
  
  # respawn worker on death
  cluster.on "death", (worker) ->
    console.log "worker " + worker.pid + " died. spawning a new process..."
    delete workers[worker.pid]
    spawn
  
  # ... server setup ... //
  express = require("express")
  app = express()
  server = http.createServer(app)
  app.set "server", server
  app.set "config", config
  require("./config/express") app
  
  # setup web socket
  io = require("socket.io").listen(server)
  app.set "io", io

  # we want the configured-aws object to be a singleton
  app.set "aws", aws
 
  # setup server services and start listening
  require("./tweets") app
  require("./routes") app
  server.listen config.port, ->
    console.log "listening on %d, in %s mode", config.port, app.get("env")
  
  # expose app
  exports = module.exports = app


# ... worker processes pull tweets from queue, analyze sentiment, then publish ... //
else

  console.log "worker process started"

  async = require "async"

  sqs = new aws.SQS()
  sns = new aws.SNS()

  # begin polling sqs for tweets
  (pollSqs = ->
    receiveOpts =
      QueueUrl: config.urls.sqs.tweetMap
      WaitTimeSeconds: 20 # max = 20 seconds

    sqs.receiveMessage receiveOpts, (err, data) ->
      if err
        console.log "error receiving sqs msg", err, err.stack
        return

      # no messages in queue, long poll again
      if not data.Messages?
        pollSqs()
        return

      for msg in data.Messages
        tweet = JSON.parse msg.Body
        # console.log "tweet.text: ", tweet.text
        
        # sends tweets to server http endpoint '/receive'
        send = (callback) ->
          sendTweet = (tweet) ->
            console.log "sendTweet tweet.text: ", tweet.text

            # use sns if production env
            if config.env isnt "dev"
              sns.sendMessage
                Message: JSON.stringify tweet
                TopicArn: config.urls.sns.tweetsWithSentiment
              (err, data) -> callback(err)

            # otherwise send to localhost:3000/receive
            else
              payload = JSON.stringify tweet
              opts =
                path: '/receive', port: 3000, method: 'POST'
                headers:
                  'Content-Type': 'application/json'
                  'Content-Length': Buffer.byteLength payload
              req = http.request opts, -> callback null
              req.on "error", (err) -> callback err
              req.end payload

          # get tweet sentiment for 1% of tweets
          if Math.random() < 0.1
            alchemy.sentiment tweet.text, {}, (err, res) ->
              if err
                callback err
                return
              console.log res.statusInfo if res.status is "ERROR"
              tweet.sentiment = res.docSentiment
              console.log "\nSENTIMENT: ", tweet.sentiment
              sendTweet(tweet)
          else
            sendTweet(tweet)

        # removes tweet from sqs queue
        remove = (callback) ->
          sqs.deleteMessage
            QueueUrl: config.urls.sqs.tweetMap
            ReceiptHandle: msg.ReceiptHandle
            (err, data) -> callback err

        async.parallel [send, remove],
          (err, _) ->
            console.log err, err.stack if err
            # continue polling sqs queue
            pollSqs()
  )()
