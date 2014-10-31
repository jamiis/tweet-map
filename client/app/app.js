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
.factory('socket', function (socketFactory) {
  return socketFactory();
})
.controller("MapCtrl",['$scope', 'GoogleMapApi'.ns(), function ($scope, GoogleMapApi, socket) {
  // do stuff with your $scope
  // it should be NOTED that some of the directives at least require something to be defined originally
  // ie:
  // $scope.markers = [] // and not undefined!

  /*
  * GoogleMapApi is a promise with a
  * then callback of the google.maps object
  *   @pram: maps = google.maps
  */
  GoogleMapApi.then(function(maps) {
    console.log('google maps api loaded');
    $scope.map = {
        center: {
            latitude: 45,
            longitude: -73
        },
        zoom: 8
    };
    /*
    socket.on('tweet', function (tweet) {
      console.log(tweet);
    });
    */
  });
}]);
