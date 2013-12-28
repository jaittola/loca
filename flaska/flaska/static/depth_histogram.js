/**
  * Histogram of depths
  */
define(function() {
    'use strict';

    var DepthHistogram = function() {
        var that = {};
        var depths = []

        that.setDepths = function(depthMeasurements) {
            depths = [];
            for (var dm in depthMeasurements) {
                if (depthMeasurements.hasOwnProperty(dm)) {
                    depths.push(Math.ceil(depthMeasurements[dm].point.depth));
                }
            }
            d3.select("#graph").html("");
            that.createHistogram();
        }

        that.createHistogram = function() {
            // Formatters for counts and times (converting numbers to Dates).
            var formatCount = d3.format(".0f");
            var formatDepth = d3.format(".0f");

            var margin = {top: 10, right: 40, bottom: 25, left: 10},
            width = 640 - margin.left - margin.right,
            height = 440 - margin.top - margin.bottom;

            var x = d3.scale.linear()
                .domain([0, 40])
                .range([0, width]);

            // Generate a histogram using twenty uniformly-spaced bins.
            var data = d3.layout.histogram()
                .bins(x.ticks(20))(depths);

            var y = d3.scale.linear()
                .domain([0, d3.max(data, function(d) { return d.y; })])
                .range([height, 0]);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .tickFormat(formatDepth);

            var svg = d3.select("#graph").append("svg")
                .attr("class", "histogram")
                .attr("width", width + margin.left + margin.right)
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
                .attr("height", function(d) { return height - y(d.y); });

            bar.append("text")
                .attr("class", "label")
                .attr("dy", ".75em")
                .attr("y", 6)
                .attr("x", x(data[0].dx) / 2)
                .attr("text-anchor", "middle")
                .text(function(d) { return formatCount(d.y); });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            // Add an x-axis label.
            svg.append("text")
                .attr("class", "label")
                .attr("text-anchor", "end")
                .attr("x", width)
                .attr("y", height - 6)
                .text("Depth (m)");

            // Add a label for the whole graph
            var label = d3.select("#graph").append("p")
                .attr("class", "img_text");
            label.html("Distribution of depths");

            // Fix the width of the enclosing graph element.
            $("#graph").css({"width": (width + margin.left + margin.right) + "px" })
        }

        return that;
    }

    return DepthHistogram;
})
