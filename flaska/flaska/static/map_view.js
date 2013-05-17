'use strict';

/**
  * Base class for the map views.
  */
define(function() {
    var MapView = function() {
        var zoom = 12;
        var centerLat = 60.15067161;
        var centerLon = 24.96664072;

        var cookie = $.cookie('map_pos');
        if (cookie) {
            zoom = cookie.zoom;
            centerLat = cookie.lat;
            centerLon = cookie.lon;
        }

        this.map = new google.maps.Map(document.getElementById("map_canvas"),
                                       { zoom: zoom,
                                         scaleControl: true,
                                         center: new google.maps.LatLng(centerLat, centerLon),
                                         mapTypeId: google.maps.MapTypeId.HYBRID
                                       });

        // State variable to prevent fetching new data points all the time
        // while moving or zooming the map.
        this.dragging = false;

        // The info window to use for marker details.
        this.infoWindow = new google.maps.InfoWindow();

        // Update the data on the view.
        // To be re-implemented in the inherited classes.
        this.update = function(mapView) { };

        // Do not re-implement this in the inherited classes.
        // Updates the current position into a cookie.
        this.viewChanged = function(mapView) {
            var centerLat = mapView.map.center.lat();
            var centerLon = mapView.map.center.lng();
            var zoom = mapView.map.zoom;

            $.cookie('map_pos',
                     { lat: centerLat,
                       lon: centerLon,
                       zoom: zoom },
                     { path: "/",
                       expires: 365 })

            mapView.update(mapView);
        }

        // Utility for HTML encoding.
        this.encode = function(value) {
            return $('<div/>').text(value).html();
        };

        // Return true if a position is on the current map view, false
        // if not.
        this.isInView = function(mapView, point) {
            var bounds = mapView.map.getBounds();
            var neCorner = bounds.getNorthEast();
            var swCorner = bounds.getSouthWest();

            if (point.latitude < neCorner.lat() &&
                point.latitude > swCorner.lat() &&
                point.longitude < neCorner.lng() &&
                point.longitude > swCorner.lng()) {
                return true;
            }
            return false;
        };

        this.makeMarker = function(point, color) {
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(point.latitude,
                                                 point.longitude),
                flat: true,
                visible: true,
                icon: {fillColor: color,
                       fillOpacity: 1.0,
                       path: google.maps.SymbolPath.CIRCLE,
                       strokeColor: color}
            });
            marker.point = point;

            return marker;
        };

        // Hack for getting the correct object to the event listeners.
        var mv = this;

        google.maps.event.addListener(this.map, 'bounds_changed', function() {
            if (!mv.dragging) {
                mv.viewChanged(mv);
            }
        });
        google.maps.event.addListener(this.map, 'dragstart', function() {
            mv.dragging = mv;
        });
        google.maps.event.addListener(this.map, 'dragend', function() {
            mv.dragging = false;
            mv.viewChanged(mv);
        });
    };

    return MapView;
});
