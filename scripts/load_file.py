#!/usr/bin/env python

import sys

max_lines_in_tx = 50
lines_in_tx = 0
coords_written = 0

def ensure_in_tx():
    global lines_in_tx

    if 0 == lines_in_tx:
        print "BEGIN;";

    lines_in_tx += 1

def end_tx(force=False):
    global lines_in_tx

    if max_lines_in_tx == lines_in_tx or force:
        print "COMMIT;"
        lines_in_tx = 0

def writeout(s):
    global lines_in_tx

    ensure_in_tx()
    print s
    end_tx()

def fl_coord(coordstr, hemisphere, neg_hemisphere, deg_nums=2):
    if len(coordstr) < deg_nums:
        return None

    # Translate the DDMM.xxx value to a floating point degree value.
    value = float(coordstr[0:deg_nums]) + float(coordstr[deg_nums:]) / 60.0
    if hemisphere == neg_hemisphere:
        value = -1.0 * value
    return value

def writeout_coords(fields, input_date):
    global coords_written

    if len(fields) < 6:
        return
    # Format the timestamp
    ts = fields[5]
    datestamp = "'{0} {1}:{2}:{3}'".format(input_date,
                                           ts[0:2],
                                           ts[2:4],
                                           ts[4:6])


    # Get coordinate values.
    lat = fl_coord(fields[1], fields[2], "S")
    lon = fl_coord(fields[3], fields[4], "W", deg_nums=3)

    if lat is not None and lon is not None:
        writeout("INSERT INTO position (pos_time_utc, latitude, longitude) "
                 "VALUES ({0}, {1}, {2});".format(datestamp,
                                                  lat, lon))
        coords_written += 1

def writeout_depth(fields):
    if len(fields) < 5:
        return
    if 0 == coords_written:
        # We need a coordinate value before a depth can be inserted.
        return

    depth = float(fields[3])
    unit = fields[4]

    if unit != 'M':
        pass

    writeout("INSERT INTO depth (position_id, depth) "
             "SELECT COALESCE(MAX(POSITION_ID), -1), {0} "
             "FROM POSITION;".format(depth))

def read_input(input, input_date):
    linenum = 0

    try:
        for line in input:
            linenum += 1
            fields = line.split(",")
            if len(fields) < 1:
                continue

            if fields[0] == "$GPGLL":
                writeout_coords(fields, input_date)
            elif fields[0] == "$IIDBT":
                writeout_depth(fields)
    except Exception,ex:
        sys.stderr.write("Failure on line {0}\n".format(linenum));
        raise

def main():
    if len(sys.argv) != 3:
        sys.stderr.write("Usage: {0} [input file] [input date]\n".format(sys.argv[0]))
        sys.exit(1)

    input_file = sys.argv[1]
    input_date = sys.argv[2]

    try:
        if input_file == "-":
            read_input(sys.stdin, input_date)
        else:
            with open(input_file) as input:
                read_input(input, input_date)

    except IOError,ioe:
        sys.stderr.write("Loading data failed: {0}\n".format(ioe));
        sys.exit(1)

    end_tx(force=True)


if __name__ == "__main__":
    main()
