/**
 * A map that shows depth measurements.
 */
define(["map_view", "depth_gradient", "depth_histogram"],
       function(MapView, DepthGradient, DepthHistogram) {
    'use strict';

    function DepthView() {
        var that = MapView();  // Inherit mapView.

        // Dots on the map.
        var depthMarkers = {};

        // Constants.
        var allMeasurements = 0;
        var validMeasurements = 1;
        var badMeasurements = 2;

        // Whether to show only the correct, incorrect, or
        // all measurements.
        var measurementDisplayStatus = validMeasurements;

        // The gradient colors to use
        var gradient = new DepthGradient();
        var histogram = new DepthHistogram(gradient, "#graph");

        var validDepthCheckboxName = "validDepthCheckBox";

        // Start of the public or overridden methods of the base.

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

                var depth = "Depth: " + point.depth + "m";
                var lat = point.lat;
                var lon = point.lon;

                var infoStr = "<p>" + that.encode(tstamp) + "<br>" +
                    that.encode(lat) + " / " +
                    that.encode(lon) + "<br>" +
                    that.encode(depth) +
                    "<br>" +
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
            return "<form>" +
                "Depth measurement valid: " +
                '<input type="checkbox" name="' +
                validDepthCheckboxName +
                '" class="' +
                validDepthCheckboxName +
                '" value="1"' +
                (point.d_bad ? '' : 'checked="1"') +
                "></form>";
        };

        that.makeDataValidityCheckboxCallbacks = function(point) {
            $("." + validDepthCheckboxName).click(function() {
                point.d_bad = !(that.checked);
                updateMeasurementValidity(point);
            });
        };

        // Load the depth data. This is the main function herein. This
        // function gets called whenever the map is zoomed or panned.
        that.update = function(oldZoom, newZoom) {
            if (that.zoomBoundaryCrossed(oldZoom, newZoom)) {
                that.dropAllPoints(depthMarkers);
            }
            else {
                that.dropPointsOutsideBounds(depthMarkers);
            }

            var path = "/api/1/depth_data/" +
                that.getMapParams();

            $.getJSON(path, function(depthData) {
                $.each(depthData.depths, function(i, point) {
                    if (depthMarkers.hasOwnProperty(point.p_id)) {
                        // Skip the ones that we have already.
                        return;
                    }

                    var color = gradient.color(point.depth);
                    var marker = that.makeMarker(point, color, newZoom);
                    setToMap(marker);

                    depthMarkers[point.p_id] = marker;
                });

                histogram.setDepths(depthMarkers, measurementDisplayStatus);
            });
        };

        var updateMeasurementValidity = function(point) {
            $.ajax({ url: "/api/1/measurement/" + point.p_id,
                     type: "POST",
                     data: JSON.stringify({
                         depth_erroneous: point.d_bad }),
                     dataType: "json",
                     contentType: "application/json; charset=utf-8",
                     success: reFilterMeasurements
                     });
            // TODO, error handling.
        };

        var setToMap = function(marker) {
            var mapForMarker = null;

            if (measurementDisplayStatus == allMeasurements ||
                (measurementDisplayStatus == validMeasurements &&
                 !marker.point.d_bad) ||
                (measurementDisplayStatus == badMeasurements &&
                 marker.point.d_bad)) {
                mapForMarker = that.map;
            }

            var currentMap = marker.getMap();

            if (mapForMarker != currentMap) {
                marker.setMap(mapForMarker);
            }
        };

        var reFilterMeasurements = function() {
            for (var posId in depthMarkers) {
                if (depthMarkers.hasOwnProperty(posId)) {
                    var marker = depthMarkers[posId];
                    setToMap(marker);
                }
            }
            histogram.setDepths(depthMarkers, measurementDisplayStatus);
        }

        var setupControlPanel = function() {
            $.get("/snippets/depth_view/control_panel/", function(data) {
                $("#controls").html(data);
                $(".measurement_selector_radio").click(function() {
                    measurementDisplayStatus =
                        $('.measurement_selector_radio:checked').val();
                    reFilterMeasurements();

                });
                setupHistogramActiveBinding();
            });
        };

        var setupViewSize = function() {
            var w = ($("#toplevel").width() - histogram.totalWidth - 2);
            if (w <= 0 || !histogram.visible) {
                setHistogramVisible(false);
                w = $("#toplevel").width();
            }
            $("#map_canvas").width(w);
        }

        var setupWindowResizeHandler = function() {
            $(window).resize(function() {
                setupViewSize();
            });
        }

        var setHistogramVisible = function(visible) {
            histogram.visible = visible;
            $("#histogramVisible").prop("checked", visible);
        }

        function setupHistogramActiveBinding() {
            $("#histogramVisible").click(function() {
                histogram.visible = this.checked;
                setupViewSize();
                histogram.showHistogram();
            });
        }

        setupViewSize();
        setupWindowResizeHandler();
        setupControlPanel();

        return that;
    };

    var dv = new DepthView();
})
