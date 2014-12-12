###*
Twitter connection handling
###
"use strict"

# setup and auth twitter
async = require "async"
config = require "./config/env"
_ = require("underscore")
_.mixin require "underscore.deep"
db = require("dynamodb").ddb(
  accessKeyId: config.keys.aws.key
  secretAccessKey: config.keys.aws.keySecret
)
# ensures sqs defined in module scope
sqs = null

# tweets are saved to dynamo in batches which are pulled from this queue
tweetsQueue = []

# aws errors when rate limit exceed so delay is 10 seconds
timeout =
  error: 10000
  standard: 1000

# util for formatting incoming tweets
formatTweetsForDB = (tweets) ->
  # boss ass functional-style function to format tweets for our dynamoDB table
  _.chain(tweets).filter((t) ->
    # remove tweets that don't have required db indices: id_str and timestamp_ms.
    t.id_str? and t.timestamp_ms?
  ).map((t) ->
    # adjust key names
    t.id = t.id_str
    t.user.id = t.user.id_str
    # flatten deeply-nested tweet object to single layer of keys.
    _.chain(t).deepToFlat().pick(
      "id", "timestamp_ms", "text",
      "user.screen_name", "user.id",
      "user.follower_count", "user.friend_count",
      "coordinates.coordinates", "place"
    # just in case: remove key-pairs with null or empty-string values.
    ).invert().omit([null, ""]).invert().value()
  ).value()

batchProcessTweets = ->
  # wait until num of tweets in queue exceeds dynamo's maximum batch size
  if tweetsQueue.length < 25
    setTimeout batchProcessTweets, timeout.standard
    return

  sublists = (list, size) ->
    list = list.slice(0)
    subs = []
    subs.push list.splice(0,size) while list.length > 0
    return subs

  # dynamo max batch size is 25
  queueBatches = sublists(tweetsQueue, 10)

  # sqs max batch size is 10
  uploadBatches = sublists(tweetsQueue, 25)

  # reset tweetsQueue
  tweetsQueue = []
  
  # async send tweet batches to sqs
  enqueue = (callback) ->
    async.map queueBatches,
      (batch, mapCallback) ->
        console.log "sqs batch size: ", batch.length
        sqs.sendMessageBatch
          QueueUrl: config.urls.sqs.tweetMap
          Entries: (
            Id: tweet.id.toString()
            MessageBody: JSON.stringify
              lat   : tweet.coordinates.coordinates[0]
              lng   : tweet.coordinates.coordinates[1]
              text  : tweet.text
              id    : tweet.id
          ) for tweet in batch,
          (err, data) -> mapCallback(err)
      (err, _) -> callback(err)

  # async batch write tweets to dynamo
  upload = (callback) ->
    async.map uploadBatches,
      (batch, mapCallback) ->
        console.log "dynamo batch size: ", batch.length
        db.batchWriteItem {'tweets': formatTweetsForDB(batch)}, {},
          (err, _) -> mapCallback(err)
      (err, _) -> callback(err)

  async.parallel [upload, enqueue],
    (err, _) ->
      console.log err, err.stack if err
      # after uploads finish, reset batchProcessTweets timeout
      setTimeout batchProcessTweets,
        (if err then timeout.error else timeout.standard)

module.exports = (app) ->
  
  # configure twit client
  config = app.get "config"
  twit = new (require("twit"))(
    consumer_key: config.keys.twitter.key
    consumer_secret: config.keys.twitter.keySecret
    access_token: config.keys.twitter.token
    access_token_secret: config.keys.twitter.tokenSecret
  )

  sqs = new (app.get "aws").SQS()
  
  # filter on the whole world;
  filter =
    locations: ["-180", -"90", "180", "90"]
    language: "en"
  
  twitter =
    stream: twit.stream("statuses/filter", filter)
    socket: null

    listenForTweets: ->
      # short circuit
      return unless twitter.socket?
      twitter.stream.on "tweet", (tweet) ->
        tweetsQueue.push tweet if tweet.coordinates?

    updateFilter: (words) ->
      # short circuit
      return if not twitter.socket or not twitter.stream
      
      # new words filter based on previous stream filter
      filter = twitter.stream.params
      if words then filter.track = words else delete filter.track
      
      # create new stream object
      newStream = twit.stream("statuses/filter", filter)
      newStream.once "connected", (res) ->
        
        # stop old stream once the new stream has connected
        twitter.stream.stop()
        
        # start new filtered stream
        twitter.stream = newStream
        twitter.listenForTweets()
        return
      return

  # initiate socket connection
  app.get("io").sockets.on "connection", (socket) ->
    console.log "socket connected"
    
    # set socket object on twitter object
    twitter.socket = socket
    
    # start listening for tweets on twitter stream
    twitter.listenForTweets()

    # begin calling batchProcessTweets() at regular intervals if dev env
    setTimeout batchProcessTweets, timeout.standard if config.env is "dev"
    return

  app.set "twitter", twitter
  return
