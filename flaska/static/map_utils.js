var map = null;
var depthDataPoints = [];
var theRoute = null;
var dragging = false;

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

var depthColors = [
    [2, "#FF0000"],
    [5, "#FF69B4"],
    [10, "#FFB6C1"],
    [15, "#8A2BE2"],
    [20, "#4169E1"],
    [30, "#87CEFA"],
    [0, "#7CFC00"]  // Deeper than all above.
];

function depthLegendId(cell) {
    return "depthLegendCell_" + cell;
}

function depthFigure(depth) {
    if (depth == 0) {
        return "";
    }

    return depth;
}

function makeDepthLegend() {
    var cells = "";

    // This function creates a table with the depth ranges. The color
    // of the depth range is on the background of each cell.

    // Construct a table of the depth ranges.
    for (var i = 0; i < depthColors.length; ++i) {
        cells = cells +
            "<td id=\"" + depthLegendId(i) + "\">" +
            depthFigure(depthColors[i][0]) + "</td>";
    }

    var tablestring =
        // "<p id=\"depth_legend_table_p\">" +
        "<table id=\"depth_legend_table\">" +
        "<tbody><tr>" +
        "<td>Depth legend (m):</td>" +
        cells +
        "</tr></tbody></table>"
        // + "</p>";
        ;

    // Add the depth range table to the document.
    $("#depth_legend").append(tablestring);

    // Add colors depth ranges to the css.
    for (var i = 0; i < depthColors.length; ++i) {
        $("#" + depthLegendId(i)).css({"background-color": depthColors[i][1],
                                       "width": "3em",
                                       "text-align": "right"});
    }
}

function getColor(depth) {
    var i;

    for (i = 0; i < depthColors.length - 1; ++i) {
        if (depth < depthColors[i][0]) {
            return depthColors[i][1];
        }
    }

    // We ran to the end.
    return depthColors[i][1];
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
 * Show the depths with markers on the map.
 */
function fetchDepths() {
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
        "&sensor=false&callback=initialize";
    document.body.appendChild(script);

    makeDepthLegend();
}
