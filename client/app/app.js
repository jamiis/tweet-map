'use strict';

angular.module('tweetMapApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'btford.socket-io'
])
.config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/main',
      controller: 'MainCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
})
.factory('socket', function (socketFactory) {
  return socketFactory();
})
.controller('MainCtrl', function (socket) {
  socket.on('tweet', function (tweet) {
    console.log(tweet);
  });
});
