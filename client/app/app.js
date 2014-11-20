'use strict';

angular.module('tweetMapApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'btford.socket-io',
  'uiGmapgoogle-maps'
])
.config(function ($routeProvider, $locationProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/map',
      controller: 'MapCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });

  $locationProvider.html5Mode(true);
})
.config(function (uiGmapGoogleMapApiProvider) {
  uiGmapGoogleMapApiProvider.configure({
    // TODO key: 'your api key',
    v: '3.17',
    libraries: 'weather,geometry,visualization'
  });
})
.factory('socket', function(socketFactory) {
  return socketFactory();
})
.controller("MapCtrl", function($scope, uiGmapGoogleMapApi, socket) {
  $scope.map = {};
  $scope.markers = [];

  uiGmapGoogleMapApi.then(function(maps) {
    console.log('google maps api loaded');
    $scope.map = {
        center: { latitude: 0.0, longitude: 0.0 },
        zoom: 2,
        options: {}
    };
    socket.on('tweet', function (tweet) {
      // TODO this pop should not be here but markers only appear if it is
      //$scope.markers.pop();
      console.log('tweet ', tweet);
      $scope.markers.push(tweet);
    });
  });
});
