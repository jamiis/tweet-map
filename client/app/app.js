'use strict';

angular.module('tweetMapApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'btford.socket-io',
  'google-maps'.ns()
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
//'GoogleMapApiProvider'.ns() == 'uiGmapGoogleMapApiProvider'
.config(['GoogleMapApiProvider'.ns(), function (GoogleMapApi) {
  GoogleMapApi.configure({
    // TODO key: 'your api key',
    v: '3.17',
    libraries: 'weather,geometry,visualization'
  });
}])
.factory('socket', function(socketFactory) {
  return socketFactory();
})
.controller("MapCtrl", ['$scope', 'GoogleMapApi'.ns(), 'socket', function($scope, GoogleMapApi, socket) {
  $scope.map = {};
  $scope.markers = [];

  GoogleMapApi.then(function(maps) {
    console.log('google maps api loaded');
    $scope.map = {
        center: { latitude: 0.0, longitude: 0.0 },
        zoom: 2,
        options: {}
    };
    socket.on('tweet', function (tweet) {
      // TODO this pop should not be here but markers only appear if it is
      $scope.markers.pop();
      $scope.markers.push({
        latitude: tweet.coordinates.coordinates[0],
        longitude: tweet.coordinates.coordinates[1],
        title: tweet.text,
        id: tweet.id
      })
    });
  });
}]);
