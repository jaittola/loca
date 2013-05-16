'use strict';

/**
 * A view of the trips.
 */
define(["map_view"], function(MapView) {
    function TripView() {
        MapView.call(this);  // Inherit MapView

        this.update = function(tripView) { }
    }
    var tv = new TripView();
})
