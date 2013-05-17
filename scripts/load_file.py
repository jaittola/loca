#!/usr/bin/env python

import argparse
import sys

import psycopg2

def fl_coord(coordstr, hemisphere, neg_hemisphere, deg_nums=2):
    if len(coordstr) < deg_nums:
        return None

    # Translate the DDMM.xxx value to a floating point degree value.
    value = float(coordstr[0:deg_nums]) + float(coordstr[deg_nums:]) / 60.0
    if hemisphere == neg_hemisphere:
        value = -1.0 * value
    return value

def writeout_coords(db, trip_id, input_info, fields):
    if len(fields) < 6:
        return -1
    # Format the timestamp
    ts = fields[5]
    datestamp = "'{0} {1}:{2}:{3}'".format(input_info.trip_date,
                                           ts[0:2],
                                           ts[2:4],
                                           ts[4:6])


    # Get coordinate values. Skip if fields are empty (that may happen if
    # there is no GPS fix yet).
    if len(fields[1]) == 0 or len(fields[3]) == 0:
        return -1

    lat = fl_coord(fields[1], fields[2], "S")
    lon = fl_coord(fields[3], fields[4], "W", deg_nums=3)

    if lat is None or lon is None:
        raise Exception("Invalid position data")

    position_cursor = db.cursor()
    position_cursor.execute("INSERT INTO position "
                            "(pos_time_utc, trip_id, latitude, longitude) "
                            "VALUES "
                            "(%s, %s, %s, %s) "
                            "RETURNING id",
                            (datestamp, trip_id, lat, lon))
    pos_id_data = position_cursor.fetchone()
    position_cursor.close()

    if pos_id_data is None:
        raise Exception("Inserting position id failed")
    return pos_id_data[0]

def writeout_depth(db, position_id, input_info, fields):
    if len(fields) < 5 or position_id < 0:
        # We need a coordinate value before a depth can be inserted.
        return

    depth = float(fields[3])
    unit = fields[4]

    if unit != 'M':
        pass

    depth_cursor = db.cursor()
    depth_cursor.execute("INSERT INTO depth "
                         "(position_id, depth) "
                         "VALUES "
                         "(%s, %s)",
                         (position_id, depth))
    depth_cursor.close()

def writeout_wind(db, position_id, fields):
    if len(fields) < 5 or position_id < 0:
        # Coordinates needed before we can insert wind data.
        return

    if len(fields[1]) == 0 or len(fields[3]) == 0:
        # No data => no wind.
        return

    angle = int(fields[1])
    true_apparent = 1 if 'T' == fields[2] else 0
    speed = float(fields[3])
    speed_unit = fields[4]

    if 'N' == speed_unit:     # Knots
        speed = speed / 2.0   # Convert to m/s
    elif 'K' == speed_unit:   # km/h, unlikely
        speed = speed / 3.6
    # Otherwise the unit should be m/s - but who knows.

    wind_cursor = db.cursor()
    wind_cursor.execute("INSERT INTO wind "
                        "(position_id, speed, angle, true_apparent) "
                        "VALUES "
                        "(%s, %s, %s, %s)",
                        (position_id, speed, angle, true_apparent))
    wind_cursor.close()

def writeout_waterspeed(db, position_id, fields):
    if len(fields) < 9 or position_id < 0:
        # Coordinates needed
        return

    speed = float(fields[5])
    speed_unit = fields[6]

    if 'N' != speed_unit:
        raise Exception("Unknown speed unit %{0}".format(speed_unit))

    speed_cursor = db.cursor()
    speed_cursor.execute("INSERT INTO water_speed "
                         "(position_id, speed) "
                         "VALUES "
                         "(%s, %s)",
                         (position_id, speed))
    speed_cursor.close()

def writeout_cog_and_sog(db, position_id, fields):
    if len(fields) < 7 or position_id < 0:
        # Coordinates needed
        return

    if len(fields[1]) == 0 or len(fields[5]) == 0:
        # Course or speed fields empty
        return

    course = float(fields[1])
    speed = float(fields[5])
    speed_unit = fields[6]

    if 'N' != speed_unit:
        raise Exception("Unknown speed unit %{0}".format(speed_unit))

    cogsog_cursor = db.cursor()
    cogsog_cursor.execute("INSERT INTO ground_speed_course "
                         "(position_id, speed, course) "
                         "VALUES "
                         "(%s, %s, %s)",
                         (position_id, speed, course))
    cogsog_cursor.close()
                # $IIVTG,226.95,T,226.95,M,5.80,N,,,D*69
                #        deg    T    deg M spd kn

def read_input(db, trip_id, input_info, input):
    linenum = 0
    position_id = -1

    try:
        for line in input:
            linenum += 1
            fields = line.split(",")
            if len(fields) < 1:
                continue

            if fields[0] == "$GPGLL":  # Lat/lon
                position_id = writeout_coords(db, trip_id, input_info, fields)
            elif fields[0] == "$IIDBT": # Depth below transducer
                writeout_depth(db, position_id, input_info, fields)
            elif fields[0] == "$IIMWV": # Wind speed and angle
                writeout_wind(db, position_id, fields)
            elif fields[0] == "$IIVHW": # Water speed and heading
                writeout_waterspeed(db, position_id, fields)
            elif fields[0] == "$IIVTG": # Course over ground and ground speed
                writeout_cog_and_sog(db, position_id, fields)

    except Exception,ex:
        sys.stderr.write("Failure on line {0}\n".format(linenum));
        raise

def fetch_user_id(db, user_email):
    userid_cursor = db.cursor()

    userid_cursor.execute("SELECT id FROM users WHERE user_email = %s",
                (user_email,))
    user_info = userid_cursor.fetchone()
    userid_cursor.close()

    if not user_info:
        raise Exception("Unknown user e-mail address")
    return user_info[0]

def setup_trip(db, input_info):
    user_id = fetch_user_id(db, input_info.user_email)

    trip_cursor = db.cursor()
    trip_cursor.execute("INSERT INTO trip "
                        "(user_id, trip_name, trip_date, vessel_name) "
                        "VALUES "
                        "(%s, %s, %s, %s) "
                        "RETURNING id",
                        (user_id,
                         input_info.trip_name,
                         input_info.trip_date,
                         input_info.vessel_name))
    trip_data = trip_cursor.fetchone()
    trip_cursor.close()

    if not trip_data:
        raise Exception("Inserting trip info failed")
    return trip_data[0]

def load_data(db, input_info, trip_id):
    if input_info.input_file == "-":
        read_input(db, trip_id, input_info, sys.stdin)
    else:
        with open(input_info.input_file) as input:
            read_input(db, trip_id, input_info, input)

def update_depth_display_ranges(db, trip_id):
    dr_cursor = db.cursor()

    dr_cursor.execute("SELECT update_depth_display_ranges(%s)",
                      (trip_id, ))
    dr_cursor.close()

def main():
    parser = argparse.ArgumentParser(description="Read NMEA data and write it "
                                     "into database.")
    parser.add_argument('input_file', metavar="input_file",
                        type=str,
                        help="Name of input file. Use - for stdin")
    parser.add_argument('-t', '--date', dest="trip_date",
                        help="The date of this trip",
                        required=True)
    parser.add_argument('-e', '--email', dest="user_email",
                        help="The e-mail address of the application user",
                        required=True)
    parser.add_argument('-n', '--name', dest="trip_name",
                        help="A name or description for the trip")
    parser.add_argument('-s', '--vessel', dest="vessel_name",
                        help="The name of the vessel")
    parser.add_argument('-d', '--db-name', dest="db_name",
                        help="Database name")
    parser.add_argument('-u', '--db-user', dest="db_user",
                        help="Database user name")
    parser.add_argument('-p', '--db-passwd', dest="db_passwd",
                        help="Database password")
    input_info = parser.parse_args()

    db = db_conn(input_info.db_name, input_info.db_user, input_info.db_passwd)
    if db is None:
        sys.stderr.write("Connecting to database failed.\n")
        sys.exit(1)

    result = 0

    try:
        trip_id = setup_trip(db, input_info)
        print("Loading data ...")
        load_data(db, input_info, trip_id)
        db.commit()
        print("Loaded. Now performing display range modifications ...")
        update_depth_display_ranges(db, trip_id)
        db.commit()
        print("Done.")
    except Exception,ex:
        sys.stderr.write("Loading data failed: {0}\n".format(ex));
        db.rollback()
        result = 1

    db.close()
    return result

def db_conn(db_name, db_user, db_passwd):
    return psycopg2.connect("dbname={} user={} password={}"
                            .format(db_name, db_user, db_passwd))

if __name__ == "__main__":
    main()
