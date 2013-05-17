'use strict';

/**
 * A map that shows depth measurements.
 */
define(["map_view", "depth_gradient"], function(MapView, DepthGradient) {
    function DepthView() {
        MapView.call(this);  // Inherit.

        // Dots on the map.
        this.depthMarkers = {};

        // Constants.
        this.allMeasurements = 0;
        this.validMeasurements = 1;
        this.badMeasurements = 2;

        // Whether to show only the correct, incorrect, or
        // all measurements.
        this.measurementDisplayStatus = this.validMeasurements;

        // The gradient colors to use
        this.gradient = new DepthGradient();

        this.validDepthCheckboxName = "validDepthCheckBox";

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
        this.queryDepthData = function(depthView, itemCallback) {
            var bounds = depthView.map.getBounds();
            if (null == bounds || undefined == bounds) {
                alert("Map bounds are not available. Cannot show any data. " +
                      "Please change the zoom level or reload the map");
                return;
            }

            $.getJSON(depthView.getDepthDataUrl(bounds,
                                              depthView.map.getZoom()),
                      itemCallback);
        };

        // Sets up an event lister for each marker so that clicking brings
        // up an info window with data about the marker.
        this.setupMarkerInfoWindow = function(depthView, marker) {
            google.maps.event.addListener(marker, 'click', function(event) {
                var point = marker.point;
                var tstamp = "";
                // "yyyymmddhhmiss".length == 14
                if (point.pos_time_utc.length == 14) {
                    tstamp =
                        point.pos_time_utc.substr(0, 4) +
                        "-" +
                        point.pos_time_utc.substr(4, 2) +
                        "-" +
                        point.pos_time_utc.substr(6, 2) +
                        " " +
                        point.pos_time_utc.substr(8, 2) +
                        ":" +
                        point.pos_time_utc.substr(10, 2) +
                        ":" +
                        point.pos_time_utc.substr(12, 2) +
                        " UTC";
                }

                var depth = "Depth: " + point.depth + "m";
                var lat = point.latitude;
                var lon = point.longitude;

                var infoStr = "<p>" + depthView.encode(tstamp) + "<br>" +
                    depthView.encode(lat) + " / " +
                    depthView.encode(lon) + "<br>" +
                    depthView.encode(depth) +
                    "<br>" +
                    depthView.encode("position_id: " + point.position_id) +
                    "<br>" +
                    depthView.makeSuspectCheckbox(depthView, point) +
                    "</p>";

                depthView.infoWindow.setContent(infoStr);
                depthView.infoWindow.setPosition(event.latLng);
                depthView.infoWindow.open(depthView.map);
                depthView.makeDataValidityCheckboxCallbacks(depthView, point);
            });
        };

        this.makeSuspectCheckbox = function(depthView, point) {
            return "<form>" +
                "Depth measurement valid: " +
                '<input type="checkbox" name="' +
                depthView.validDepthCheckboxName +
                '" class="' +
                depthView.validDepthCheckboxName +
                '" value="1"' +
                (point.depth_erroneous ? '' : 'checked="1"') +
                "></form>";
        };

        this.updateMeasurementValidity = function(depthView, point) {
            $.ajax({ url: "/api/1/measurement/" + point.position_id,
                     type: "POST",
                     data: JSON.stringify({
                         depth_erroneous: point.depth_erroneous }),
                     dataType: "json",
                     contentType: "application/json; charset=utf-8",
                     success: function() {
                         depthView.reFilterMeasurements();
                     }});
            // TODO, error handling.
        };

        this.makeDataValidityCheckboxCallbacks = function(depthView, point) {
            $("." + depthView.validDepthCheckboxName).click(function() {
                point.depth_erroneous = !(this.checked);
                depthView.updateMeasurementValidity(depthView, point);
            });
        };

        // Load the depth data. This is the main function herein. This
        // function gets called whenever the map is zoomed or panned.
        this.update = function(depthView) {
            for (var posId in depthView.depthMarkers) {
                if (depthView.depthMarkers.hasOwnProperty(posId)) {
                    var marker = depthView.depthMarkers[posId];
                    if (depthView.isInView(depthView, marker.point)) {
                        // This point is outside the current view => remove.
                        marker.setMap(null);
                        delete depthView.depthMarkers[posId];
                    }
                }
            }

            depthView.queryDepthData(depthView, function(depthData) {
                $.each(depthData.depths, function(i, point) {
                    if (depthView.depthMarkers
                        .hasOwnProperty(point.position_id)) {
                        // Skip the ones that we have already.
                        return;
                    }

                    var color = depthView.gradient.color(point.depth);
                    var marker = depthView.makeMarker(depthView, point, color);
                    depthView.setToMap(depthView, marker);

                    depthView.depthMarkers[point.position_id] = marker;
                });
            });
        };

        this.setToMap = function(depthView, marker) {
            var mapForMarker = null;

            if (depthView.measurementDisplayStatus == depthView.allMeasurements ||
                (depthView.measurementDisplayStatus == depthView.validMeasurements &&
                 !marker.point.depth_erroneous) ||
                (depthView.measurementDisplayStatus == depthView.badMeasurements &&
                 marker.point.depth_erroneous)) {
                mapForMarker = depthView.map;
            }

            var currentMap = marker.getMap();

            if (mapForMarker != currentMap) {
                marker.setMap(mapForMarker);
            }
        };

        this.reFilterMeasurements = function() {
            for (var posId in this.depthMarkers) {
                if (this.depthMarkers.hasOwnProperty(posId)) {
                    var marker = this.depthMarkers[posId];
                    this.setToMap(this, marker);
                }
            }
        }

        this.measurementSelectorValueChanged = function() {
            this.measurementDisplayStatus =
                $('.measurement_selector_radio:checked').val();

            this.reFilterMeasurements();
        };

        this.setupControlPanel = function() {
            var dv = this;
            $.get("/snippets/depth_view/control_panel/", function(data) {
                $("#controls").html(data);
                $(".measurement_selector_radio").click(function() {
                    dv.measurementSelectorValueChanged();
                });
            });
        };

        this.setupControlPanel();
    };

    var dv = new DepthView();
})
