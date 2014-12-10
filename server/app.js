/**
 * Main application file
 */

'use strict';

// set default node env to dev
process.env.NODE_ENV = process.env.NODE_ENV || 'prod';

var cluster = require('cluster'),
     config = require('./config/env'),
          _ = require('underscore');

if (cluster.isMaster) {
  // ... cluster management ... //
  var workers = {},
         cpus = require('os').cpus().length;

  var spawn = function() {
    var worker = cluster.fork();
    workers[worker.pid] = worker;
    return worker;
  };

  // spawn 1 worker per cpu
  // TODO -1?
  _.each(_.range(cpus), spawn);

  // respawn worker on death
  cluster.on('death', function(worker) {
    console.log('worker ' + worker.pid + ' died. spawning a new process...');
    delete workers[worker.pid];
    spawn();
  });

  // ... server setup ... //
  var express = require('express'),
          app = express(),
       server = require('http').createServer(app);

  app.set('server', server);
  app.set('config', config);
  require('./config/express')(app);

  // setup web socket
  var io = require('socket.io').listen(server)
  app.set('io', io);
  require('./tweets')(app);

  // start server 
  require('./routes')(app);
  server.listen(config.port, function() {
    console.log('server listening on %d, in %s mode', config.port, app.get('env'));
  });

  // expose app
  exports = module.exports = app;
} 
else {
  console.log('worker process started');

  // ... worker process ... //
  var aws = require('aws-sdk');
  _.extend(aws.config, {
    region: 'us-east-1',
    accessKeyId: config.keys.aws.key,
    secretAccessKey: config.keys.aws.keySecret
  });

  var sqs = new aws.SQS(),
      sns = new aws.SNS();

  // begin polling sqs for tweets
  (function pollSqs() {
    var receiveOpts = {
      QueueUrl: config.urls.sqs.tweetMap,
      WaitTimeSeconds: 20 // max = 20 seconds 
    };
    sqs.receiveMessage(receiveOpts, function(err, data) {
      console.log('rec msg');
      if (err)
        console.log('error receiving sqs msg', err, err.stack);
      else {
        if (_.has(data, 'Messages')) {
          var msgs = data.Messages
          console.log('success. num message: ', msgs.length);

          // foreach message received ...
          _.each(data.Messages, function(msg) {

            console.log('msg: ', msg);

            // TODO get sentiment from alchemy api

            // delete message from queue
            var deleteOpts = {
              QueueUrl: config.urls.sqs.tweetMap,
              ReceiptHandle: msg.ReceiptHandle
            };
            sqs.deleteMessage(deleteOpts, function(err, data) {
              if (err) console.log('error deleting sqs msg ', err, err.stack);
              else pollSqs(); // TODO should be moved inside alchemy api callback
            });
          });
        }
        // no messages in queue, long poll again
        else pollSqs();

      }
    });
  }());
}
