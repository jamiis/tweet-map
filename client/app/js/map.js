function onload() {
  var lightGreyStyle = [
    {"featureType":"landscape", "stylers":[{"saturation":-100},{"lightness":65},{"visibility":"on"}]},
    {"featureType":"poi","stylers":[{"saturation":-100},{"lightness":51},{"visibility":"simplified"}]},
    {"featureType":"road.highway","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
    {"featureType":"road.arterial","stylers":[{"saturation":-100},{"lightness":30},{"visibility":"on"}]},
    {"featureType":"road.local","stylers":[{"saturation":-100},{"lightness":40},{"visibility":"on"}]},
    {"featureType":"transit","stylers":[{"saturation":-100},{"visibility":"simplified"}]},
    {"featureType":"administrative.province","stylers":[{"visibility":"off"}]},
    {"featureType":"water","elementType":"labels","stylers":[{"visibility":"on"},{"lightness":-25},{"saturation":-100}]},
    {"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ffff00"},{"lightness":-25},{"saturation":-97}]}
  ];
  var mapOptions = {
    zoom: 2,
    center: new google.maps.LatLng(0.0, 0.0),
    styles: lightGreyStyle
  };
  var map = new google.maps.Map(
    document.getElementById('map'),
    mapOptions
  );
  var tweets = new google.maps.MVCArray();
  var heatmap = new google.maps.visualization.HeatmapLayer({
    data: tweets,
    radius: 25
  });
  heatmap.setMap(map);
  
  var socket = io.connect();

  socket.on('tweet', function (tweet) {
    // add tweet location to heatmap layer
    var loc = new google.maps.LatLng(tweet.lng, tweet.lat);
    tweets.push(loc);

    // display dot on the map for 500ms
    var marker = new google.maps.Marker({
      position: loc,
      map: map,
      icon: "img/dot.png"
    });
    setTimeout(function(){
      marker.setMap(null);
    },500);
  });

  document.getElementById("filter").addEventListener("keydown", function(ev) {
    // when the user hits enter
    if (ev.keyCode == 13) {
      // format filter string before sending to server
      var words = _(this.value.split(" ")).compact().join(",");
      console.log(words);
      $.ajax('/filter/' + words, {
        type: 'POST',
        success: function(data, textStatus, jqXHR ) {
          console.log('success ', data, textStatus, jqXHR);
        },
        error: function(jqXHR, textStatus, error) {
          console.log(textStatus, error);
        }
      });
    }
  }, false);
}
