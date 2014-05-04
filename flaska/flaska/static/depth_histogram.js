/**
  * Histogram of depths
  */
define(function() {
    'use strict';

    var DepthHistogram = function(gradient, htmlElement) {
        var that = {
            totalWidth: 430,
            visible: true
        };
        var depths = [];
        var maxDepth = 0;
        var depthGradient = gradient;

        var graphElement = htmlElement;
        var margin = {top: 10, right: 20, bottom: 25, left: 10};
        var height = 440 - margin.top - margin.bottom;

        // Constants. Copy-pasta, to be removed.
        var allMeasurements = 0;
        var validMeasurements = 1;
        var badMeasurements = 2;

        function actualWidth() {
            return that.totalWidth - margin.left - margin.right;
        }

        that.setDepths = function(depthMeasurements, measurementsToShow) {
            measurementsToShow = measurementsToShow || allMeasurements;

            depths = [];
            maxDepth = 0;

            for (var dm in depthMeasurements) {
                if (depthMeasurements.hasOwnProperty(dm)) {
                    var depth = Math.ceil(depthMeasurements[dm].point.depth);

                    if (allMeasurements == measurementsToShow ||
                        (badMeasurements == measurementsToShow &&
                         depthMeasurements[dm].point.d_bad) ||
                        (validMeasurements == measurementsToShow &&
                         !depthMeasurements[dm].point.d_bad)) {
                        addDepthMeasurement(depth);
                    }
                }
            }

            that.showHistogram();
        }

        that.showHistogram = function() {
            d3.select(graphElement).html("");
            if (!that.visible) {
                return;
            }

            createHistogram();

            // Add a label for the whole graph
            var label = d3.select(graphElement).append("p")
                .attr("class", "img_text");
            label.html("Distribution of depth measuremens in this view");

            // Fix the width of the graph element that encloses the histogram.
            $(graphElement).css({"width": (actualWidth() + margin.left + margin.right) + "px" })
        }

        var addDepthMeasurement = function(depth) {
            depths.push(depth);
            maxDepth = Math.max(maxDepth, depth);
        }

        var createHistogram = function() {
            // Formatters for counts and depths
            var formatCount = d3.format(".0f");
            var formatDepth = d3.format(".0f");

            var x = d3.scale.linear()
                .domain([0, maxDepth])
                .range([0, actualWidth()]);

            // Generate a histogram using uniformly-spaced bins.
            var data = d3.layout.histogram()
                .bins(x.ticks(Math.floor(maxDepth / 2)))(depths);

            var y = d3.scale.linear()
                .domain([0, d3.max(data, function(d) { return d.y; })])
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickFormat(formatDepth);

            var svg = d3.select(graphElement).append("svg")
                .attr("class", "histogram")
                .attr("width", actualWidth() + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var bar = svg.selectAll(".bar")
                .data(data)
                .enter().append("g")
                .attr("class", "bar")
                .attr("transform", function(d) {
                    return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

            bar.append("rect")
                .attr("x", 1)
                .attr("width", x(data[0].dx) - 1)
                .attr("height", function(d) { return height - y(d.y); })
                .attr("fill", function(d) { return depthGradient.color(d.x); });

            bar.append("text")
                .attr("class", "label")
                .attr("dy", ".75em")
                .attr("y", 6)
                .attr("x", x(data[0].dx) / 2)
                .attr("text-anchor", "middle")
                .attr("writing-mode", "tb")
                .text(function(d) { return formatCount(d.y); });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            // Add an x-axis label.
            svg.append("text")
                .attr("class", "label")
                .attr("text-anchor", "end")
                .attr("x", actualWidth() + margin.left)
                .attr("y", height + margin.top + margin.bottom)
                .attr("writing-mode", "tb")
                .text("Depth (m)");
        }

        return that;
    }

    return DepthHistogram;
})
