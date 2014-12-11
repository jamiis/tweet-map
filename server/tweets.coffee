###*
Twitter connection handling
###
"use strict"

# setup and auth twitter
async = require "async"
config = require "./config/env"
_ = require("underscore").mixin(require("underscore.deep"))
db = require("dynamodb").ddb(
  accessKeyId: config.keys.aws.key
  secretAccessKey: config.keys.aws.keySecret
)

# tweets are saved to dynamo in batches which are pulled from this queue
tweetsQueue = []

# aws errors when rate limit exceed so delay is 10 seconds
saveTweetDelay =
  error: 10000
  standard: 1000

# util for formatting incoming tweets
formatTweetsForDB = (tweets) ->
  # boss ass functional-style function to format tweets for our dynamoDB table
  _.chain(tweets).filter((t) ->
    # remove tweets that don't have required db indices: id_str and timestamp_ms.
    t.id_str? and t.timestamp?
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

saveTweets = ->
  # wait until num of tweets in queue exceeds dynamo's maximum batch size
  if tweetsQueue.length < 25
    setTimeout saveTweets, saveTweetDelay.standard
    return

  batches = []

  # split tweets into batches of 25 for bulk writing to dynamo 
  batches.push tweetsQueue.splice(0, 25) while tweetsQueue.length > 25
  
  # async batch write to dynamo
  upload = (batch, callback) ->
    console.log "batch size: ", batch.length
    ###
    db.batchWriteItem
      {'tweets': formatTweetsForDB(batch)}, {},
      (err, res) -> callback(err)
    ###
        
  async.map batches, upload, (err, results) ->
    if err then console.log "error: ", err
    
    # after uploads finish, reset saveTweets timeout
    # TODO empty queue before saving tweets
    setTimeout saveTweets, (if err then saveTweetDelay.error else saveTweetDelay.standard)
  return

module.exports = (app) ->
  
  # configure twit client
  config = app.get "config"
  twit = new (require("twit"))(
    consumer_key: config.keys.twitter.key
    consumer_secret: config.keys.twitter.keySecret
    access_token: config.keys.twitter.token
    access_token_secret: config.keys.twitter.tokenSecret
  )
  
  # filter on the whole world;
  filter = locations: ["-180", -"90", "180", "90"]
  
  #var filter = { track: 'will' };
  twitter =
    stream: twit.stream("statuses/filter", filter)
    socket: null

    listenForTweets: ->
      # short circuit
      return unless twitter.socket?
      twitter.stream.on "tweet", (tweet) ->
        #if (config.env == 'dev') console.log('tweet', tweet);
        # TODO uncomment 
        # tweetsQueue.push tweet if tweet.coordinates?
        # TODO remove emit
        if tweet.coordinates?
          twitter.socket.emit 'tweet',
            lat     : tweet.coordinates.coordinates[0]
            lng     : tweet.coordinates.coordinates[1]
            title   : tweet.text
            id      : tweet.id

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
    
    # begin calling saveTweets() at regular intervals if dev env
    # setTimeout saveTweets, saveTweetDelay.standard if config.env is "dev"
    
    # set socket object on twitter object
    twitter.socket = socket
    
    # start listening for tweets on twitter stream
    twitter.listenForTweets()
    return

  app.set "twitter", twitter
  return
