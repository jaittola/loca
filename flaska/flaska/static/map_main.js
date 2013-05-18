'use strict';

// Page set-up
function viewLoader() {
    require([viewName]);
}

// Map loader.
function loadMap() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "//maps.googleapis.com/maps/api/js?" +
        "v=3.10&" +
        "key=" + mapsKey +
        "&sensor=false" +
        "&libraries=visualization" +
        "&callback=viewLoader";

    document.body.appendChild(script);
}
