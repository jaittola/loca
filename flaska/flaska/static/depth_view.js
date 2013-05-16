'use strict';

/**
 * A map that shows depth measurements.
 */
define(["map_view", "depth_gradient"], function(MapView, DepthGradient) {
    function DepthView() {
        MapView.call(this);  // Inherit.

        // Dots on the map.
        this.depthMarkers = {};

        // The gradient colors to use
        this.gradient = new DepthGradient();

        // Utility for creating the URL for loading depth data.
        this.getDepthDataUrl = function(bounds, zoom) {
            var neCorner = bounds.getNorthEast();
            var swCorner = bounds.getSouthWest();

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

            return "/api/1/depth_data/" +
                "?lat0=" + swCorner.lat() +
                "&lon0=" + swCorner.lng() +
                "&lat1=" + neCorner.lat() +
                "&lon1=" + neCorner.lng() +
                "&mPerPix=" + mPerPix;
        };

        // Load depth data
        this.queryDepthData = function(mapView, itemCallback) {
            var bounds = mapView.map.getBounds();
            if (null == bounds || undefined == bounds) {
                alert("Map bounds are not available. Cannot show any data. " +
                      "Please change the zoom level or reload the map");
                return;
            }

            $.getJSON(mapView.getDepthDataUrl(bounds,
                                              mapView.map.getZoom()),
                      itemCallback);
        };

        // Sets up an event lister for each marker so that clicking brings
        // up an info window with data about the marker.
        this.setupMarkerInfoWindow = function(mapView, marker) {
            google.maps.event.addListener(marker, 'click', function(event) {
                var tstamp = "";
                // "yyyymmddhhmiss".length == 14
                if (measurement.pos_time_utc.length == 14) {
                    tstamp =
                        measurement.pos_time_utc.substr(0, 4) +
                        "-" +
                        measurement.pos_time_utc.substr(4, 2) +
                        "-" +
                        measurement.pos_time_utc.substr(6, 2) +
                        " " +
                        measurement.pos_time_utc.substr(8, 2) +
                        ":" +
                        measurement.pos_time_utc.substr(10, 2) +
                        ":" +
                        measurement.pos_time_utc.substr(12, 2) +
                        " UTC";
                }

                var depth = "Depth: " + measurement.depth + "m";
                var lat = measurement.latitude;
                var lon = measurement.longitude;

                var infoStr = "<p>" + mapView.encode(tstamp) + "<br>" +
                    mapView.encode(lat) + " / " +
                    mapView.encode(lon) + "<br>" +
                    mapView.encode(depth) +
                    "</p>";

                mapView.infoWindow.setContent(infoStr);
                mapView.infoWindow.setPosition(event.latLng);
                mapView.infoWindow.open(mapView.map);
            });
        };

        // Load the depth data.
        this.update = function(mapView) {
            var bounds = mapView.map.getBounds();
            var neCorner = bounds.getNorthEast();
            var swCorner = bounds.getSouthWest();

            for (var posId in mapView.depthMarkers) {
                if (mapView.depthMarkers.hasOwnProperty(posId)) {
                    var marker = mapView.depthMarkers[posId];
                    if (marker.measurement.latitude > neCorner.lat() ||
                        marker.measurement.latitude < swCorner.lat() ||
                        marker.measurement.longitude > neCorner.lng() ||
                        marker.measurement.longitude < swCorner.lng()) {
                        // This point is outside the current view => remove.
                        marker.setMap(null);
                        delete mapView.depthMarkers[posId];
                    }
                }
            }

            mapView.queryDepthData(mapView, function(depthData) {
                $.each(depthData.depths, function(i, measurement) {
                    if (mapView.depthMarkers
                        .hasOwnProperty(measurement.position_id)) {
                        // Skip the ones that we have already.
                        return;
                    }

                    var color = mapView.gradient.color(measurement.depth);
                    var marker = new google.maps.Marker({
                        position: new google.maps.LatLng(measurement.latitude,
                                                         measurement.longitude),
                        flat: true,
                        visible: true,
                        icon: {fillColor: color,
                               fillOpacity: 1.0,
                               path: google.maps.SymbolPath.CIRCLE,
                               strokeColor: color}
                    });

                    marker.setMap(mapView.map);
                    marker.measurement = measurement;

                    mapView.setupMarkerInfoWindow(mapView, marker);
                    mapView.depthMarkers[measurement.position_id] = marker;
                });
            });
        };
    };

    var dv = new DepthView();
})
