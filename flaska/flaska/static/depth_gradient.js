define(['./hsv2rgb'], function(hsv2rgb) {
    'use strict';

    var DepthGradient = function() {
        var that = {};

        // Start of the public interface.

        // Get the color corresponding to a depth
        // from the gradient.
        that.color = function(depth) {
            var roundedDepth = Math.ceil(depth);

            if (roundedDepth < 1) {
                // With depths less than 1 meter, we always round them up
                // to 1.  The first slot of the gradient is measured for
                // spots where there is no measurement (required for the
                // heat map).
                return depthGradient[1];
            }

            if (roundedDepth >= depthGradient.length) {
                // Max value if depth goes over the edge.
                return depthGradient[depthGradient.length - 1];
            }

            return depthGradient[roundedDepth];
        };

        // End of public part.

        // End point of the colour scale: depths greater than this
        // value are shown with the maximum color.
        var maxDepth = 40;

        // The gradient consists of two color scales. Here's the
        // splitting point.
        var heatmapSplit = 10;

        // This is the actual gradient. The first slot has alpha set
        // to zero so that a heatmap using this color gradient shows
        // nothing if there are no measurements at a particular
        // coordinate.
        var depthGradient = [
            "rgba(0, 0, 0, 0)"
        ];

        var interpolate = function(loop, chunks, start, end) {
            return (loop * ((end - start) / chunks)) + start;
        };

        var depthFigure = function(depth) {
            var frac = Math.floor(depth % 5.0);
            if (0 != frac) {
                return ""
            }

            return depth;
        };

        // Build the actual gradient.
        var makeGradient = function() {
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

            for (var i = 0; i < heatmapSplit; ++i) {
                depthGradient.push(hsv2rgb.hsvToRgb(interpolate(i,
                                                                heatmapSplit,
                                                                startHue1,
                                                                endHue1),
                                           sat, value));
            }
            for (; i < maxDepth; ++i) {
                depthGradient.push(hsv2rgb.hsvToRgb(interpolate(i,
                                                                maxDepth,
                                                                endHue1,
                                                                endHue2),
                                                    sat, value));
            }
        };

        var depthLegendId = function(cell) {
            return "depthLegendCell_" + cell;
        };

        // Build a table of depth legends. The background color of each
        // table cell is the same that is shown on the map for the same
        // depth. Every fifth cell has the depth figure.
        var makeDepthLegend = function() {
            var cells = "";

            for (var i = 0; i < depthGradient.length; ++i) {
                cells = cells +
                    "<td id=\"" + depthLegendId(i) + "\">" +
                    depthFigure(i) + "</td>";
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
            $("#" + depthLegendId(0))
                .css({"background-color": depthGradient[1],
                      "width": "1em",
                      "text-align": "right"});

            // Other columns.
            for (var i = 1; i < depthGradient.length; ++i) {
                $("#" + depthLegendId(i))
                    .css({"background-color": depthGradient[i],
                          "width": "1em",
                          "text-align": "right"});
            }
        };

        // Create the gradient and the depth legend elements.
        makeGradient();
        makeDepthLegend();

        return that;
    };

    return DepthGradient;
})
