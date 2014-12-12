"use strict"

# load keys into environment if dev
if process.env.NODE_ENV is "dev"
  env = require("node-env-file")
  
  # only local environments should have keys.env
  env __dirname + "/keys.env"

# use for your api keys, secrets, etc.
module.exports =
  keys:
    aws:
      key: process.env.AWS_ACCESS_KEY
      keySecret: process.env.AWS_ACCESS_KEY_SECRET

    twitter:
      key: process.env.TWITTER_CONSUMER_KEY
      keySecret: process.env.TWITTER_CONSUMER_SECRET
      token: process.env.TWITTER_ACCESS_TOKEN
      tokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET

    alchemy:
      key: process.env.ALCHEMY_KEY

  urls:
    sqs:
      tweetMap: process.env.AWS_SQS_TWEET_MAP_QUEUE_URL
    sns:
      tweetsWithSentiment: process.env.AWS_SNS_TOPIC_ARN_TWEETS_WITH_SENTIMENT
