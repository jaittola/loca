'use strict';

define(['./hsv2rgb'], function(hsv2rgb) {
    var DepthGradient = function() {
        // End point of the colour scale: depths greater than this
        // value are shown with the maximum color.
        this.maxDepth = 40;

        // The gradient consists of two color scales. Here's the
        // splitting point.
        this.heatmapSplit = 10;

        // This is the actual gradient. The first slot has alpha set
        // to zero so that a heatmap using this color gradient shows
        // nothing if there are no measurements at a particular
        // coordinate.
        this.depthGradient = [
            "rgba(0, 0, 0, 0)"
        ];

        this.interpolate = function(loop, chunks, start, end) {
            return (loop * ((end - start) / chunks)) + start;
        };

        this.depthLegendId = function(cell) {
            return "depthLegendCell_" + cell;
        };

        this.depthFigure = function(depth) {
            var frac = Math.floor(depth % 5.0);
            if (0 != frac) {
                return ""
            }

            return depth;
        };

        this.color = function(depth) {
            var roundedDepth = Math.ceil(depth);

            if (roundedDepth < 1) {
                // With depths less than 1 meter, we always round them up
                // to 1.  The first slot of the gradient is measured for
                // spots where there is no measurement (required for the
                // heat map).
                return this.depthGradient[1];
            }

            if (roundedDepth >= this.depthGradient.length) {
                // Max value if depth goes over the edge.
                return this.depthGradient[this.depthGradient.length - 1];
            }

            return this.depthGradient[roundedDepth];
        };

        // Build the actual gradient.
        this.makeGradient = function() {
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

            for (var i = 0; i < this.heatmapSplit; ++i) {
                this.depthGradient
                    .push(hsv2rgb.hsvToRgb(this.interpolate(i,
                                                            this.heatmapSplit,
                                                            startHue1,
                                                            endHue1),
                                           sat, value));
            }
            for (; i < this.maxDepth; ++i) {
                this.depthGradient
                    .push(hsv2rgb.hsvToRgb(this.interpolate(i,
                                                            this.maxDepth,
                                                            endHue1,
                                                            endHue2),
                                           sat, value));
            }
        };

        // Build a table of depth legends. The background color of each
        // table cell is the same that is shown on the map for the same
        // depth. Every fifth cell has the depth figure.
        this.makeDepthLegend = function() {
            var cells = "";

            for (var i = 0; i < this.depthGradient.length; ++i) {
                cells = cells +
                    "<td id=\"" + this.depthLegendId(i) + "\">" +
                    this.depthFigure(i) + "</td>";
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
            $("#" + this.depthLegendId(0))
                .css({"background-color": this.depthGradient[1],
                      "width": "1em",
                      "text-align": "right"});

            // Other columns.
            for (var i = 1; i < this.depthGradient.length; ++i) {
                $("#" + this.depthLegendId(i))
                    .css({"background-color": this.depthGradient[i],
                          "width": "1em",
                          "text-align": "right"});
            }
        };

        // Create the gradient and the depth legend elements.
        this.makeGradient();
        this.makeDepthLegend();
    };

    return DepthGradient;
})
