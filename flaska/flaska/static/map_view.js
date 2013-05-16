'use strict';

/**
  * Base class for the map views.
  */
define(function() {
    var MapView = function() {
        this.map = new google.maps.Map(document.getElementById("map_canvas"),
                                       { zoom: 12,
                                         scaleControl: true,
                                         center: new google.maps.LatLng(59.87, 23.25),
                                         mapTypeId: google.maps.MapTypeId.HYBRID
                                       });

        // State variable to prevent fetching new data points all the time
        // while moving or zooming the map.
        this.dragging = false;

        // The info window to use for marker details.
        this.infoWindow = new google.maps.InfoWindow();

        // Update the data on the view.
        // To be implemented in the inherited classes.
        this.update = function(mapView) { };

        // Utility for HTML encoding.
        this.encode = function(value) {
            return $('<div/>').text(value).html();
        };

        // Hack for getting the correct object to the event listeners.
        var mv = this;

        google.maps.event.addListener(this.map, 'bounds_changed', function() {
            if (!mv.dragging) {
                mv.update(mv);
            }
        });
        google.maps.event.addListener(this.map, 'dragstart', function() {
            mv.dragging = mv;
        });
        google.maps.event.addListener(this.map, 'dragend', function() {
            mv.dragging = false;
            mv.update(mv);
        });
    };

    return MapView;
});
