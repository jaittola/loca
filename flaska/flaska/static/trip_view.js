'use strict';

/**
 * A view of the trips.
 */
define(["map_view"], function(MapView) {
    function TripView() {
        MapView.call(this);  // Inherit MapView

        // Dots on the map.
        this.points = {};

        // Trips that are shown
        this.shownTripIds = {};

        // Fetch the list of trips from the server and show it.
        this.loadTrips = function() {
            var tripView = this;
            $.getJSON("/api/1/trip/", function(tripData) {
                $("#controls").html("<p>Latest trips:</p> " +
                                    '<form id="latestTripsForm"></form>');
                $.each(tripData.trips, function(i, trip) {
                    var trip_id = tripView.encode(trip.trip_id);
                    var tripString =
                        '<input type="checkbox" ' +
                        'id="tripEnabled' + trip_id +
                        '" value="' + trip_id + '">' +
                        tripView.encode(trip.vessel_name) + " " +
                        tripView.encode(trip.trip_date) + " " +
                        tripView.encode(trip.trip_name) +
                        "<br>";
                    $("#latestTripsForm").append(tripString);
                    tripView.makeTripDisplayCallback(tripView, trip_id);
                });
            });
        }

        this.makeTripDisplayCallback = function(tripView, trip_id) {
            $("#tripEnabled" + trip_id).click(function() {
                if (this.checked) {
                    tripView.downloadAndShow(tripView, trip_id);
                }
                else {
                    tripView.dropTrip(tripView, trip_id);
                }
            });
        };

        this.downloadAndShow = function(tripView, trip_id) {
            var path = "/api/1/trip/" + tripView.encode(trip_id);
            $.getJSON(path, function(tripData) {
                $.each(tripData.points, function(i, point) {
                    var marker = tripView.makeMarker(point, "#ff0000");
                    tripView.showOnMap(tripView, marker);
                    tripView.points[point.position_id] = marker;
                });
            });
        };

        this.dropTrip = function(tripView, trip_id) {
            delete tripView.shownTripIds[trip_id];
            for (var posId in tripView.points) {
                if (tripView.points.hasOwnProperty(posId)) {
                    var point = tripView.points[posId];
                    point.setMap(null);
                    delete tripView.points[posId];
                }
            }
        };

        this.showOnMap = function(tripView, point) {
            if (tripView.isInView(tripView, point.point)) {
                point.setMap(tripView.map);
            }
            else {
                point.setMap(null);
            }
        };

        this.update = function(tripView) {
            for (var posId in tripView.points) {
                if (tripView.points.hasOwnProperty(posId)) {
                    tripView.showOnMap(tripView, tripView.points[posId]);
                }
            }
        }

        this.loadTrips();
    }
    var tv = new TripView();
})
