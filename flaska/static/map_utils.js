var map = null;

// State variable to prevent fetching new data points all the time
// while moving or zooming the map.
var dragging = false;

// PolyLine
var theRoute = null;

// Markers
var depthDataPoints = [];

// The heatmap.
var heatmap = null;

// Max depth for the heatmap (meters)
var heatmapMaxDepth = 40;

// Two-part color scale in the gradient. Here's the split.
var heatmapSplit = 10;

// This is a function actually. We use a variable for now to select
// the depth map display mode.
var fetchDepths = null;

function getDepthDataUrl(bounds) {
    var neCorner = bounds.getNorthEast();
    var swCorner = bounds.getSouthWest();

    // The magical 111317.0 is the conversion from latitude degrees
    // (in the north-south direction) to meters.
    var mPerPix = ((neCorner.lat() - swCorner.lat()) * 111317.0) /
        $("#map_canvas").height();

    return "/depth_data/" +
        "?lat0=" + swCorner.lat() +
        "&lon0=" + swCorner.lng() +
        "&lat1=" + neCorner.lat() +
        "&lon1=" + neCorner.lng() +
        "&mPerPix=" + mPerPix;
}

var depthGradient = [
    "rgba(0, 0, 0, 0)"
];

function linearInterpolation(loop, maxLoop, start, end) {
    return ((loop / maxLoop) * (end - start)) + start;
}

function makeDepthGradient() {

    // We make a gradient in HSV.
    // Sat and Value stay constant in the
    // gradient and we change the color only.

    var sat = 100;
    var value = 100;
    var red = hsvToRgb(0, 100, 100);

    // First slot was set to zero in the initialization. It also has
    // alpha set to zero so that the heatmap shows nothing if there
    // are no measurements at a particular coordinate.

    // 1st part: Start form red and end with green.
    var startHue1 = 0;
    var endHue1 = 120;

    // 2nd part: end with blue.
    var endHue2 = 240;

    var i;

    for (var i = 0; i < heatmapSplit; ++i) {
        depthGradient.push(hsvToRgb(linearInterpolation(i, heatmapSplit,
                                                        startHue1, endHue1),
                                    sat, value));
    }
    for (; i < heatmapMaxDepth; ++i) {
        depthGradient.push(hsvToRgb(linearInterpolation(i, heatmapMaxDepth,
                                                        endHue1, endHue2),
                                    sat, value));
    }

    console.log("DepthGradient has " + depthGradient.length +
                " entries and is " + depthGradient);
}

function depthLegendId(cell) {
    return "depthLegendCell_" + cell;
}

function depthFigure(depth) {
    var frac = Math.floor(depth % 5.0);
    if (0 != frac) {
        return ""
    }

    return depth;
}

function makeDepthLegend() {
    var cells = "";

    // This function creates a table with the depth ranges. The color
    // of the depth range is on the background of each cell.

    // First, we construct a table of the depth ranges.
    for (var i = 0; i < depthGradient.length; ++i) {
        cells = cells +
            "<td id=\"" + depthLegendId(i) + "\">" +
            depthFigure(i) + "</td>";
    }

    var tablestring =
        "<table id=\"depth_legend_table\">" +
        "<tbody><tr>" +
        "<td>Depth legend (m):</td>" +
        cells +
        "</tr></tbody></table>";

    // Add the depth range table to the document.
    $("#depth_legend").append(tablestring);

    // Add colors of the depth ranges to the css.  We use the same
    // gradient that gets supplied to the heat map, but we skip the
    // first column (which is transparent and has no color), and put
    // the second field of the gradient there twice.

    // First column
    $("#" + depthLegendId(0)).css({"background-color": depthGradient[1],
                                   "width": "1em",
                                   "text-align": "right"});

    // Other columns.
    for (var i = 1; i < depthGradient.length; ++i) {
        $("#" + depthLegendId(i)).css({"background-color": depthGradient[i],
                                       "width": "1em",
                                       "text-align": "right"});
    }
}

function getColor(depth) {
    roundedDepth = Math.ceil(depth);

    if (roundedDepth < 1) {
        // Minimum used is always 1 if there is a measurement.
        return depthColors[1];
    }

    if (roundedDepth >= depthGradient.length) {
        // Max value if depth goes over the edge.
        return depthGradient[depthGradient.length - 1];
    }

    return depthGradient[roundedDepth];
}

function queryDepthData(itemCallback) {
    var bounds = map.getBounds();
    if (null == bounds || undefined == bounds) {
        alert("Map bounds are not available. Cannot show any data. " +
              "Please change the zoom level or reload the map");
        return;
    }

    $.getJSON(getDepthDataUrl(bounds), itemCallback);
}

/**
 * Show the depths with a heatmap layer on the map.
 */
function fetchDepthsToHeatmap() {
    var heatmapDataPoints = []

    if (null == heatmap) {
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatmapDataPoints,
            opacity: 1,
            radius: 1,
            maxIntensity: heatmapMaxDepth,
            map: map,
            gradient: depthGradient
        });
    }

    queryDepthData(function(depthData) {
        $.each(depthData.depths, function(i, measurement) {
            heatmapDataPoints.push({
                location: new google.maps.LatLng(measurement.latitude,
                                                 measurement.longitude),
                weight: measurement.depth });
        });
        heatmap.setData(heatmapDataPoints);
    });
}

/**
 * Show the depths with markers on the map.
 */
function fetchDepthsWithMarkers() {
    // TODO, fix this. We should not remove items from the map if they are
    // already in the viewpoint.
    for (var i = 0; i < depthDataPoints.length; ++i) {
        depthDataPoints[i].setMap(null);
    }
    depthDataPoints = [];

    queryDepthData(function(depthData) {
        $.each(depthData.depths, function(i, measurement) {
            var color = getColor(measurement.depth);
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

            marker.setMap(map);
            depthDataPoints.push(marker);
        });

        console.log("Depth data points: " + depthDataPoints.length);
    });
}


/**
 * Show the depths as a polyline. This is a proof-of-concept
 * first trial and does not really work: it will create a
 * red mat of stuff over every path travelled.
 *
 * This might be useful for the trip view though.
 */
function fetchPolyLine() {
    var positions = []

    queryDepthData(function(depthData) {
        $.each(depthData.depths, function(i, measurement) {
            positions.push(new google.maps.LatLng(measurement.latitude,
                                                  measurement.longitude));
        });
        putRouteToMap(positions);
    });
}

function putRouteToMap(positions) {
    theRoute = new google.maps.Polyline({
        path: positions,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
        editable: false
    });
    theRoute.setMap(map);
}
/*
 * End of polyline stuff.
 */


function boundsChanged() {
    if (!dragging) {
        fetchDepths();
    }
}

function dragStart() {
    dragging = true;
}

function dragEnd() {
    dragging = false;
    boundsChanged();
}

function initialize() {
    fetchDepths = fetchDepthsWithMarkers;
    // fetchDepths = fetchDepthsToHeatmap;

    var mapOptions = {
        zoom: 12,
        scaleControl: true,
        center: new google.maps.LatLng(59.87, 23.25),
        mapTypeId: google.maps.MapTypeId.HYBRID
    };

    map = new google.maps.Map(document.getElementById("map_canvas"),
                              mapOptions);
    google.maps.event.addListener(map, 'bounds_changed', boundsChanged);
    google.maps.event.addListener(map, 'dragstart', dragStart);
    google.maps.event.addListener(map, 'dragend', dragEnd);
}

function loadMap() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "http://maps.googleapis.com/maps/api/js?" +
        "v=3.10&" +
        "key=" + mapsKey +
        "&sensor=false" +
        "&libraries=visualization" +
        "&callback=initialize";
    document.body.appendChild(script);

    makeDepthGradient();
    makeDepthLegend();
}
