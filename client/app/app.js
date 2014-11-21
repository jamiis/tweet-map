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

  uiGmapGoogleMapApi.then(function(maps) {
    console.log('google maps api loaded');

    $scope.map = {
      heat: {
        show: true,
        tweetLocations: new maps.MVCArray(),
        options: {
          radius: 25
        },
        onCreated: function(layer) {
          $scope.map.heat.layer = layer;
          console.log($scope.map);
        }
      },
      center: { latitude: 0.0, longitude: 0.0 },
      zoom: 2,
      options: {}
    };

    socket.on('tweet', function (tweet) {
      // TODO this pop should not be here but markers only appear if it is
      //$scope.markers.pop();

      if ($scope.map.heat.layer) {
        console.log('tweet ', tweet);

        // add tweet to heatmap layer
        var loc = new maps.LatLng(tweet.lat, tweet.lng);
        $scope.map.heat.tweetLocations.push(loc);
        $scope.map.heat.layer.setData(
          $scope.map.heat.tweetLocations
        );

        // TODO ping map for 500ms with tweet location
      }
    });
  });
});
