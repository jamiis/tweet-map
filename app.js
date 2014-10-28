var express = require('express')
  // , http = require('http');

var app = express();

app.get('/', function (req, res) {
  res.send('Hello World!')
});

/*
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
});

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
*/

var server = app.listen(process.env.PORT || 3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})
