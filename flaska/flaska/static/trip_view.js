/**
 * A view of the trips.
 */
define(["map_view"], function(MapView) {
    'use strict';

    function TripView() {
        var that = MapView();  // Inherit MapView

        // Dots on the map.
        var points = {};

        // Re-implemented from the base class.
        that.update = function() {
            for (var posId in points) {
                if (points.hasOwnProperty(posId)) {
                    showOnMap(points[posId]);
                }
            }
        }

        // Fetch the list of trips from the server and show it.
        var loadTrips = function() {
            $.getJSON("/api/1/trip/", function(tripData) {
                $("#controls").html("<p>Latest trips:</p> " +
                                    '<form id="latestTripsForm"></form>');
                $.each(tripData.trips, function(i, trip) {
                    var trip_id = that.encode(trip.trip_id);
                    var tripString =
                        '<input type="checkbox" ' +
                        'id="tripEnabled' + trip_id +
                        '" value="' + trip_id + '">' +
                        that.encode(trip.vessel_name) + " " +
                        that.encode(trip.trip_date) + " " +
                        that.encode(trip.trip_name) +
                        "<br>";
                    $("#latestTripsForm").append(tripString);
                    makeTripDisplayCallback(trip_id);
                });
            });
        }

        var makeTripDisplayCallback = function(trip_id) {
            $("#tripEnabled" + trip_id).click(function() {
                if (this.checked) {
                    downloadAndShow(trip_id);
                }
                else {
                    dropTrip(trip_id);
                }
            });
        };

        var downloadAndShow = function(trip_id) {
            var path = "/api/1/trip/" + that.encode(trip_id);
            $.getJSON(path, function(tripData) {
                $.each(tripData.points, function(i, point) {
                    var marker = that.makeMarker(point, "#ff0000");
                    showOnMap(marker);
                    points[point.position_id] = marker;
                });
            });
        };

        var dropTrip = function(trip_id) {
            for (var posId in points) {
                if (points.hasOwnProperty(posId)) {
                    var point = points[posId];
                    point.setMap(null);
                    delete points[posId];
                }
            }
        };

        var showOnMap = function(point) {
            if (that.isInView(point.point)) {
                if (that.map != point.getMap()) {
                    point.setMap(that.map);
                }
            }
            else {
                point.setMap(null);
            }
        };

        loadTrips();

        return that;
    }
    var tv = new TripView();
})
