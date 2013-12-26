/**
  * Base class for the map views.
  */
define(function() {
    'use strict';

    var MapView = function() {
        var that = {};

        // Set up.
        var zoom = 12;
        var centerLat = 60.15067161;
        var centerLon = 24.96664072;

        var cookie = $.cookie('map_pos');
        if (cookie) {
            zoom = cookie.zoom;
            centerLat = cookie.lat;
            centerLon = cookie.lon;
        }

        // The actual map.
        that.map = new google.maps.Map(document.getElementById("map_canvas"),
                                       { zoom: zoom,
                                         scaleControl: true,
                                         center: new google.maps.LatLng(centerLat, centerLon),
                                         mapTypeId: google.maps.MapTypeId.HYBRID
                                       });

        // State variable to prevent fetching new data points all the time
        // while moving or zooming the map.
        that.dragging = false;

        // The info window to use for marker details.
        that.infoWindow = new google.maps.InfoWindow();

        // Update the data on the view.
        // To be re-implemented in the inherited classes.
        that.update = function() { };

        // Utility that goes through the points and removes those
        // that are no longer in the view.
        that.dropPointsOutsideBounds = function(points) {
            for (var posId in points) {
                if (points.hasOwnProperty(posId)) {
                    var point = points[posId];
                    if (!that.isInView(point.point)) {
                        point.setMap(null);
                        delete points[posId];
                    }
                }
            }
        };

        // Called when the viewport of the map changes because of
        // panning or zooming. Updates the current position into a
        // cookie, and calls the update function.
        var viewChanged = function() {
            var centerLat = that.map.center.lat();
            var centerLon = that.map.center.lng();
            var zoom = that.map.zoom;

            $.cookie('map_pos',
                     { lat: centerLat,
                       lon: centerLon,
                       zoom: zoom },
                     { path: "/",
                       expires: 365 })

            that.update();
        }

        // Utility for HTML encoding.
        that.encode = function(value) {
            return $('<div/>').text(value).html();
        };

        // Return true if a position is on the current map view, false
        // if not.
        that.isInView = function(point) {
            var bounds = that.map.getBounds();
            var neCorner = bounds.getNorthEast();
            var swCorner = bounds.getSouthWest();

            if (point.lat < neCorner.lat() &&
                point.lat > swCorner.lat() &&
                point.lon < neCorner.lng() &&
                point.lon > swCorner.lng()) {
                return true;
            }
            return false;
        };

        // Make a marker at the specified position and color.
        that.makeMarker = function(point, color) {
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(point.lat,
                                                 point.lon),
                flat: true,
                visible: true,
                icon: {fillColor: color,
                       fillOpacity: 1.0,
                       path: google.maps.SymbolPath.CIRCLE,
                       strokeColor: color}
            });
            marker.point = point;
            that.setupMarkerInfoWindow(marker);

            return marker;
        };

        // Sets up an event lister for each marker so that clicking brings
        // up an info window with data about the marker.
        that.setupMarkerInfoWindow = function(marker) {
            google.maps.event.addListener(marker, 'click', function(event) {
                var point = marker.point;
                var tstamp = "";
                // "yyyymmddhhmiss".length == 14
                if (point.t_utc.length == 14) {
                    tstamp =
                        point.t_utc.substr(0, 4) +
                        "-" +
                        point.t_utc.substr(4, 2) +
                        "-" +
                        point.t_utc.substr(6, 2) +
                        " " +
                        point.t_utc.substr(8, 2) +
                        ":" +
                        point.t_utc.substr(10, 2) +
                        ":" +
                        point.t_utc.substr(12, 2) +
                        " UTC";
                }

                var depth = "";
                var waterSpeed = "";
                var groundSpeed = "";
                var course = "";
                if (point.hasOwnProperty("depth")) {
                    depth = that.encode("Depth: " + point.depth + " m") +
                        "<br>";
                }
                if (point.hasOwnProperty("ws")) {
                    waterSpeed = that.encode("Speed (log): " +
                                                point.ws + " kn") +
                        "<br>";
                }
                if (point.hasOwnProperty("gs")) {
                    groundSpeed = that.encode("SOG (GPS speed): " +
                                           point.gs + " kn") +
                        "<br>";
                }
                if (point.hasOwnProperty("course")) {
                    course = that.encode("Course (GPS): " +
                                           point.course + "°") +
                        "<br>";
                }


                var infoStr = "<p>" + that.encode(tstamp) + "<br>" +
                    that.encode(point.lat) + " / " +
                    that.encode(point.lon) + "<br>" +
                    depth +
                    waterSpeed +
                    groundSpeed +
                    course +
                    that.encode("position_id: " + point.p_id) +
                    "<br>" +
                    that.makeSuspectCheckbox(point) +
                    "</p>";

                that.infoWindow.setContent(infoStr);
                that.infoWindow.setPosition(event.latLng);
                that.infoWindow.open(that.map);
                that.makeDataValidityCheckboxCallbacks(point);
            });
        };

        that.makeSuspectCheckbox = function(point) {
            return "";
        };

        that.makeDataValidityCheckboxCallbacks = function(point) {
        };

        // Utility for creating the URL for loading depth data.
        that.getMapParams = function() {
            var bounds = that.map.getBounds();
            var neCorner = bounds.getNorthEast();
            var swCorner = bounds.getSouthWest();
            var zoom = that.map.getZoom();

            // This is the conversion factor from latitude degrees
            // (in the north-south direction) to meters.
            var latDegToMeters = 111317.0;

            var mPerPix = ((neCorner.lat() - swCorner.lat()) *
                           latDegToMeters) /
                $("#map_canvas").height();

            // This is empirical (and could be considered rubbish): The size
            // of the circles that we use as depth markers increases with
            // smaller zoom levels. Hence we need to increase the mPerPix
            // figure somehow so that we do not load data unnecessarily.
            if (zoom < 14) {
                mPerPix = mPerPix * 2.0;
            }
            else if (zoom < 11) {
                mPerPix = mPerPix * 4.0;
            }

            return "?lat0=" + swCorner.lat() +
                "&lon0=" + swCorner.lng() +
                "&lat1=" + neCorner.lat() +
                "&lon1=" + neCorner.lng() +
                "&mPerPix=" + mPerPix;
        };

        google.maps.event.addListener(that.map, 'bounds_changed', function() {
            if (!that.dragging) {
                viewChanged();
            }
        });
        google.maps.event.addListener(that.map, 'dragstart', function() {
            that.dragging = true;
        });
        google.maps.event.addListener(that.map, 'dragend', function() {
            that.dragging = false;
            viewChanged();
        });

        return that;
    };

    return MapView;
});
