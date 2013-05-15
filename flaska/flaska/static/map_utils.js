
function depthView() {

    // Depth color scale.
    //
    // Returns an object with some methods and the gradient data.
    var makeGradient = function() {
        var gra = {
            // End point of the colour scale: depths greater than this
            // value are shown with the maximum color.
            maxDepth: 40,

            // The gradient consists of two color scales. Here's the
            // splitting point.
            heatmapSplit: 10,
        };

        gra.interpolate = function(loop, chunks, start, end) {
            return (loop * ((end - start) / chunks)) + start;
        }

        gra.depthLegendId = function(cell) {
            return "depthLegendCell_" + cell;
        }

        gra.depthFigure = function(depth) {
            var frac = Math.floor(depth % 5.0);
            if (0 != frac) {
                return ""
            }

            return depth;
        }

        gra.color = function(depth) {
            var roundedDepth = Math.ceil(depth);

            if (roundedDepth < 1) {
                // With depths less than 1 meter, we always round them up
                // to 1.  The first slot of the gradient is measured for
                // spots where there is no measurement (required for the
                // heat map).
                return gra.depthGradient[1];
            }

            if (roundedDepth >= gra.depthGradient.length) {
                // Max value if depth goes over the edge.
                return gra.depthGradient[gra.depthGradient.length - 1];
            }

            return gra.depthGradient[roundedDepth];
        }

        // Build the actual gradient.
        gra.makeGradient = function() {
            // The first slot has alpha set to zero so that a heatmap
            // using this color gradient shows nothing if there are no
            // measurements at a particular coordinate.

            gra.depthGradient = [
                "rgba(0, 0, 0, 0)"
            ];

            // We make a gradient in Hue-Saturation-Value (HSV) color
            // space. Sat and Value stay constant and we change the color
            // only.

            var sat = 100;
            var value = 100;

            // 1st part: Start form red and end with green.
            var startHue1 = 0;
            var endHue1 = 120;

            // 2nd part: end with blue.
            var endHue2 = 240;

            for (var i = 0; i < gra.heatmapSplit; ++i) {
                gra.depthGradient.push(hsvToRgb(gra.interpolate(i,
                                                                gra.heatmapSplit,
                                                                startHue1,
                                                                endHue1),
                                                sat, value));
            }
            for (; i < gra.maxDepth; ++i) {
                gra.depthGradient.push(hsvToRgb(gra.interpolate(i,
                                                                gra.maxDepth,
                                                                endHue1,
                                                                endHue2),
                                                sat, value));
            }
        };

        // Build a table of depth legends. The background color of each
        // table cell is the same that is shown on the map for the same
        // depth. Every fifth cell has the depth figure.
        gra.makeDepthLegend = function() {
            var cells = "";

            for (var i = 0; i < gra.depthGradient.length; ++i) {
                cells = cells +
                    "<td id=\"" + gra.depthLegendId(i) + "\">" +
                    gra.depthFigure(i) + "</td>";
            }

            var tablestring =
                "<table id=\"legend_table\">" +
                "<tbody><tr>" +
                "<td>Depth legend (m):</td>" +
                cells +
                "</tr></tbody></table>";

            // Add the depth range table to the document.
            $("#legend").append(tablestring);

            // Add colors of the depth ranges to the css. We skip the
            // first column (which is transparent and has no color), and
            // put the second field of the gradient there twice.

            // First column
            $("#" + gra.depthLegendId(0))
                .css({"background-color": gra.depthGradient[1],
                      "width": "1em",
                      "text-align": "right"});

            // Other columns.
            for (var i = 1; i < gra.depthGradient.length; ++i) {
                $("#" + gra.depthLegendId(i))
                    .css({"background-color": gra.depthGradient[i],
                          "width": "1em",
                          "text-align": "right"});
            }
        };

        // Create the gradient and the depth legend elements.
        gra.makeGradient();
        gra.makeDepthLegend();

        return gra;
    }

    var encode = function(value) {
        return $('<div/>').text(value).html();
    };

    var getDepthDataUrl = function(bounds, zoom) {
        var neCorner = bounds.getNorthEast();
        var swCorner = bounds.getSouthWest();

        // The magical 111317.0 is the conversion from latitude degrees
        // (in the north-south direction) to meters.
        var mPerPix = ((neCorner.lat() - swCorner.lat()) * 111317.0) /
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

    var queryDepthData = function(mapView, itemCallback) {
        var bounds = mapView.map.getBounds();
        if (null == bounds || undefined == bounds) {
            alert("Map bounds are not available. Cannot show any data. " +
                  "Please change the zoom level or reload the map");
            return;
        }

        $.getJSON(getDepthDataUrl(bounds, mapView.map.getZoom()), itemCallback);
    };

    // A container for the map.
    var mapView = {
        // The map canvas.
        map: new google.maps.Map(document.getElementById("map_canvas"),
                                 { zoom: 12,
                                   scaleControl: true,
                                   center: new google.maps.LatLng(59.87, 23.25),
                                   mapTypeId: google.maps.MapTypeId.HYBRID
                                 }),

        // State variable to prevent fetching new data points all the time
        // while moving or zooming the map.
        dragging: false,

        // Dots on the map.
        depthMarkers: {},

        // The gradient colors to use
        gradient: makeGradient(),

        // The info window to use for marker details.
        infoWindow: new google.maps.InfoWindow(),

        // Load the depth data.
        fetchDepths: function(mapView) {
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

            queryDepthData(mapView, function(depthData) {
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

                        var infoStr = "<p>" + encode(tstamp) + "<br>" +
                            encode(lat) + " / " + encode(lon) + "<br>" +
                            encode(depth) +
                            "</p>";

                        mapView.infoWindow.setContent(infoStr);
                        mapView.infoWindow.setPosition(event.latLng);
                        mapView.infoWindow.open(mapView.map);
                    });

                    mapView.depthMarkers[measurement.position_id] = marker;
                });
            });
        },
    };

    google.maps.event.addListener(mapView.map, 'bounds_changed', function() {
        if (!mapView.dragging) {
            mapView.fetchDepths(mapView);
        }
    });
    google.maps.event.addListener(mapView.map, 'dragstart', function() {
        mapView.dragging = true;
    });
    google.maps.event.addListener(mapView.map, 'dragend', function() {
        mapView.dragging = false;
        mapView.fetchDepths(mapView);
    });
}

function tripView() {
    // A container for the map.
    var mapView = {
        // The map canvas.
        map: new google.maps.Map(document.getElementById("map_canvas"),
                                 { zoom: 12,
                                   scaleControl: true,
                                   center: new google.maps.LatLng(59.87, 23.25),
                                   mapTypeId: google.maps.MapTypeId.HYBRID
                                 }),

        // State variable to prevent fetching new data points all the time
        // while moving or zooming the map.
        dragging: false,

        // Trips that are enabled and shown on the map.
        enabledTrips: {},

        // Dots on the map.
        markers: {},

        // The info window to use for marker details.
        infoWindow: new google.maps.InfoWindow(),
    };

    var loadTripList = function(mapView) {

    }

    loadTripList(mapView);
}


// Set up.
function loadMap() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "http://maps.googleapis.com/maps/api/js?" +
        "v=3.10&" +
        "key=" + mapsKey +
        "&sensor=false" +
        "&libraries=visualization" +
        "&callback=" + viewLoader;

    document.body.appendChild(script);
}
