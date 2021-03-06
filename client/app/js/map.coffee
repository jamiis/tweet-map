this.initMap = ->
  lightGreyStyle = [
    {
      featureType: "landscape"
      stylers: [
        {
          saturation: -100
        }
        {
          lightness: 65
        }
        {
          visibility: "on"
        }
      ]
    }
    {
      featureType: "poi"
      stylers: [
        {
          saturation: -100
        }
        {
          lightness: 51
        }
        {
          visibility: "simplified"
        }
      ]
    }
    {
      featureType: "road.highway"
      stylers: [
        {
          saturation: -100
        }
        {
          visibility: "simplified"
        }
      ]
    }
    {
      featureType: "road.arterial"
      stylers: [
        {
          saturation: -100
        }
        {
          lightness: 30
        }
        {
          visibility: "on"
        }
      ]
    }
    {
      featureType: "road.local"
      stylers: [
        {
          saturation: -100
        }
        {
          lightness: 40
        }
        {
          visibility: "on"
        }
      ]
    }
    {
      featureType: "transit"
      stylers: [
        {
          saturation: -100
        }
        {
          visibility: "simplified"
        }
      ]
    }
    {
      featureType: "administrative.province"
      stylers: [visibility: "off"]
    }
    {
      featureType: "water"
      elementType: "labels"
      stylers: [
        {
          visibility: "on"
        }
        {
          lightness: -25
        }
        {
          saturation: -100
        }
      ]
    }
    {
      featureType: "water"
      elementType: "geometry"
      stylers: [
        {
          hue: "#ffff00"
        }
        {
          lightness: -25
        }
        {
          saturation: -97
        }
      ]
    }
  ]
  map = new google.maps.Map document.getElementById("map"),
    zoom: 2
    center: new google.maps.LatLng(0.0, 0.0)
    styles: lightGreyStyle
  tweets = new google.maps.MVCArray()
  heatmap = new google.maps.visualization.HeatmapLayer
    data: tweets
    radius: 25
  heatmap.setMap map

  socket = io.connect()
  socket.on "tweet", (tweet) ->
    
    console.log tweet

    # add tweet location to heatmap layer
    loc = new google.maps.LatLng(tweet.lng, tweet.lat)
    tweets.push loc
    
    # display an icon on the map
    icon = "img/dot.png"
    time = 500

    if tweet.sentiment?
      time = 3500
      switch tweet.sentiment.type
        when "positive" then icon = "img/positive.png"
        when "negative" then icon = "img/negative.png"

    marker = new google.maps.Marker
      position: loc
      map: map
      icon: icon

    setTimeout (-> marker.setMap null), time
    return

  document.getElementById("filter").addEventListener "keydown", ((ev) ->
    
    # when the user hits enter
    if ev.keyCode is 13
      
      # format filter string before sending to server
      words = _(@value.split(" ")).compact().join(",")
      console.log words
      $.ajax "/filter/" + words,
        type: "POST"
        success: (data, textStatus, jqXHR) ->
          console.log "success ", data, textStatus, jqXHR
          return

        error: (jqXHR, textStatus, error) ->
          console.log textStatus, error
          return

    return
  ), false

  return
