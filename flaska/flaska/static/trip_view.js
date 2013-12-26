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
                $("#controls").html("<p>Trips:</p> " +
                                    '<form id="latestTripsForm"></form>');
                $.each(tripData.trips, function(i, trip) {
                    var tripId = that.encode(trip.t_id);
                    var checkboxId = "tripEnabled" + tripId;
                    var divId = "d_" + checkboxId;
                    var editId = "e_" + checkboxId;
                    var tripString =
                        '<div id="' + divId + '">' +
                        tripVisibilityCheckbox(checkboxId, tripId) +
                        tripEditLink(tripId, trip) +
                        "</div>";
                    $("#latestTripsForm").append(tripString);
                    $("#" + checkboxId)
                        .click(tripDisplayCallback);
                    $("#" + editId)
                        .click(tripEditCallback);
                });
            });
        }

        var tripVisibilityCheckbox = function(checkboxId, tripId) {
            return '<input type="checkbox" ' +
                'id="' + checkboxId + '"' +
                '" value="' + tripId + '">';
        }

        var tripEditLink = function(tripId, trip) {
            return '<a href="/update/' + tripId + '">' +
                that.encode(trip.vessel_name) + " " +
                that.encode(trip.trip_date) + " " +
                that.encode(trip.trip_name) +
                "</a>";
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

        var tripEditCallback = function(ev) {
            ev.preventDefault();
            console.log("Trip edit callback " + ev.currentTarget.id);
            var usIndex = ev.currentTarget.id.indexOf("_");
            var tripId = parseInt(ev.currentTarget.id.substring(0, usIndex));
            if (tripId >= 0) {
                showTripEdit(ev.currentTarget, tripId);
            }
        }

        var showTripEdit = function(element, tripId) {
            var editForm = "";
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
