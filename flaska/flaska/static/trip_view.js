/**
 * A view of the trips.
 */
define(["map_view"], function(MapView) {
    'use strict';

    function TripView() {
        var that = MapView();  // Inherit MapView

        // Dots on the map.
        var points = {};

        // Trips currently selected.
        var tripsInView = {};

        // Re-implemented from the base class.
        that.update = function() {
            that.dropPointsOutsideBounds(points);

            for (var tripId in tripsInView) {
                if (tripsInView.hasOwnProperty(tripId) &&
                    tripsInView[tripId] === true) {
                    downloadAndShow(tripId);
                }
            }
        }

        // Fetch the list of trips from the server and show it.
        var loadTrips = function() {
            $.getJSON("/api/1/trip/", function(tripData) {
                $("#controls").html("<p>Latest trips:</p> " +
                                    '<form id="latestTripsForm"></form>');
                $.each(tripData.trips, function(i, trip) {
                    var tripId = that.encode(trip.t_id);
                    var tripString =
                        '<input type="checkbox" ' +
                        'id="tripEnabled' + tripId +
                        '" value="' + tripId + '">' +
                        that.encode(trip.vessel_name) + " " +
                        that.encode(trip.trip_date) + " " +
                        that.encode(trip.trip_name) +
                        "<br>";
                    $("#latestTripsForm").append(tripString);
                    $("#tripEnabled" + tripId)
                        .click(tripDisplayCallback);
                });
            });
        }

	var tripDisplayCallback = function(ev) {
            var tripId = ev.currentTarget.value;
            if (this.checked) {
                tripsInView[tripId] = true;
                that.update();
            }
            else {
                dropTrip(tripId);
            }
        }

        var downloadAndShow = function(tripId) {
            var path = "/api/1/trip/" +
                that.encode(tripId) +
                that.getMapParams();

            $.getJSON(path, function(tripData) {
                $.each(tripData.points, function(i, point) {
                    if (points.hasOwnProperty(point.p_id)) {
                        // Skip the ones that we have already.
                        return;
                    }

                    point.tripId = tripId;
                    var marker = that.makeMarker(point, "#ff0000");
                    showOnMap(marker);
                    points[point.p_id] = marker;
                });
            });
        };

        var dropTrip = function(tripId) {
            tripsInView[tripId] = false;
            for (var posId in points) {
                if (points.hasOwnProperty(posId)) {
                    var point = points[posId];
                    if (point.point.tripId === tripId) {
                        point.setMap(null);
                        delete points[posId];
                    }
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
