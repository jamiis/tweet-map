/**
 * Main application routes
 */

'use strict';

var errors = require('./components/errors');

module.exports = function(app) {

  // define routes here
  app.get('/partials/:name', function (req, res) {
      var name = req.params.name;
      res.render(app.get('appPath') + '/app/partials/' + name);
  });

  // all undefined asset or api routes should return a 404
  app.route('/:url(api|auth|components|app|bower_components|assets)/*')
    .get(errors[404]);

  // all other routes should redirect to the index.html
  app.route('/*')
    .get(function(req, res) {
      res.render(app.get('appPath') + '/index');
    });
};
