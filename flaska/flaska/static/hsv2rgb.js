/**
 * With modifications from
 * http://snipplr.com/view.php?codeview&id=14590
 *
 * Original module comment below:
 *
 * * HSV to RGB color conversion
 * *
 * * H runs from 0 to 360 degrees
 * * S and V run from 0 to 100
 * *
 * * Ported from the excellent java algorithm by Eugene Vishnevsky at:
 * * http://www.cs.rit.edu/~ncs/color/t_convert.html
 */


define(function() {
    var hsv2rgb = {};

    /**
     * Translate a float value between 0 - 1.0 to a hexadecimal number
     * between 0 - 0xff.
     */
    hsv2rgb.fToHex = function(floatVal) {
        var s = Math.round(floatVal * 255).toString(16)
        if (s.length < 2) {
            return "0" + s;
        }
        return s;
    };

    /**
     * Translate r, g, b values (that are in floating point between 0 - 0.1)
     * to an rgb string. (#rrggbb).
     */
    hsv2rgb.rgbResult = function(r, g, b) {
        return "#" + hsv2rgb.fToHex(r) + hsv2rgb.fToHex(g) + hsv2rgb.fToHex(b);
    };

    /**
     * Convert hsv to RGB.
     * h = [0, 359]
     * s, v = [0, 100]
     */
    hsv2rgb.hsvToRgb = function(h, s, v) {
        var r, g, b;
        var i;
        var f, p, q, t;

        // Make sure our arguments stay in-range
        h = Math.max(0, Math.min(360, h));
        s = Math.max(0, Math.min(100, s));
        v = Math.max(0, Math.min(100, v));

        // We accept saturation and value arguments from 0 to 100 because that's
        // how Photoshop represents those values. Internally, however, the
        // saturation and value are calculated from a range of 0 to 1. We make
        // That conversion here.
        s /= 100;
        v /= 100;

        if (s == 0) {
            // Achromatic (grey)
            r = g = b = v;
            return this.rgbResult(v, v, v);
        }

        h /= 60; // sector 0 to 5
        i = Math.floor(h);
        f = h - i; // factorial part of h
        p = v * (1 - s);
        q = v * (1 - s * f);
        t = v * (1 - s * (1 - f));

        switch(i) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;

        case 1:
            r = q;
            g = v;
            b = p;
            break;

        case 2:
            r = p;
            g = v;
            b = t;
            break;

        case 3:
            r = p;
            g = q;
            b = v;
            break;

        case 4:
            r = t;
            g = p;
            b = v;
            break;

        default: // case 5:
            r = v;
            g = p;
            b = q;
        }

        return hsv2rgb.rgbResult(r, g, b);
    };

    return hsv2rgb;
})
