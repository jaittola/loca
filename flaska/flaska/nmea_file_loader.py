#!/usr/bin/env python

import argparse
import gzip
import magic
import re
import sys
import time

import psycopg2
import psycopg2.extras

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

    if len(fields[3]) < 1 or len(fields[4]) < 1:
        # Empty values. Data can be missing.
        return

    depth = float(fields[3])
    unit = fields[4]

    if unit != 'M':
        return

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
        raise Exception("Unknown speed unit {0}".format(speed_unit))

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
        raise Exception("Unknown speed unit {0}".format(speed_unit))

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
    positions_ok = 0
    position_id = -1

    try:
        for line in input:
            linenum += 1
            fields = line.split(",")
            if len(fields) < 1:
                continue

            if fields[0] == "$GPGLL":  # Lat/lon
                position_id = writeout_coords(db, trip_id, input_info, fields)
                if position_id != -1:
                    positions_ok += 1
            elif fields[0] == "$IIDBT": # Depth below transducer
                writeout_depth(db, position_id, input_info, fields)
            elif fields[0] == "$IIMWV": # Wind speed and angle
                writeout_wind(db, position_id, fields)
            elif fields[0] == "$IIVHW": # Water speed and heading
                writeout_waterspeed(db, position_id, fields)
            elif fields[0] == "$IIVTG": # Course over ground and ground speed
                writeout_cog_and_sog(db, position_id, fields)

    except Exception,ex:
        raise Exception("Failure on line {0} of the input file: {1}"
                        .format(linenum, ex));

    if 0 == positions_ok:
        # No valid positions found: fail so that everything (including
        # the metadata) gets rolled back.
        raise Exception("No valid data rows found")

def fetch_user_id(db, user_email):
    userid_cursor = db.cursor()
    userid_cursor.execute("SELECT id FROM users WHERE user_email = %s",
                (user_email,))
    user_info = userid_cursor.fetchone()
    userid_cursor.close()

    if not user_info:
        raise Exception("Unknown user e-mail address")
    return user_info[0]

def setup_trip(db, input_info, user_id=None):
    if user_id is None:
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

def printable_filename(input_info):
    if input_info.input_file == "-":
        return "stdin"
    return input_info.input_file

def augment_args(input_info):
    if not input_info.trip_date:
        input_info.trip_date = today()  # Use this as default
        if 'input_file' in input_info:
            rm = re.search("([0-9]{4}-[0-9]{2}-[0-9]{2})",
                           input_info.input_file)
            if rm:
                input_info.trip_date = rm.group(1)
    if not input_info.trip_name:
        input_info.trip_name = input_info.input_file or "[empty]"
    return input_info

def a_or_b(a, b):
    """Return a if it has a value, b otherwise"""
    return a if a else b

def load_and_update_trip(db, input_info):
    trip_cursor = db.cursor(cursor_factory=psycopg2.extras.DictCursor)
    trip_cursor.execute("SELECT "
                        "id, user_id, trip_name, trip_date, vessel_name "
                        "FROM trip "
                        "WHERE id = %s "
                        "FOR UPDATE",
                        (input_info.trip_id, ))
    trip_data_in_db = trip_cursor.fetchone()
    if not trip_data_in_db:
        trip_cursor.close()
        raise Exception("Trip with id {} not found".format(input_info.trip_id))

    input_info.user_id = trip_data_in_db['user_id']
    input_info.trip_name = a_or_b(input_info.trip_name,
                                  trip_data_in_db.get('trip_name'))
    input_info.trip_date = a_or_b(input_info.trip_date,
                                  trip_data_in_db.get('trip_date'))
    input_info.vessel_name = a_or_b(input_info.vessel_name,
                                    trip_data_in_db.get('vessel_name'))
    input_info = augment_args(input_info)
    trip_cursor.execute("UPDATE trip "
                        "SET "
                        "trip_name = %s, "
                        "trip_date = %s, "
                        "vessel_name = %s, "
                        "load_time = CURRENT_TIMESTAMP, "
                        "load_file = %s "
                        "WHERE id = %s",
                        (input_info.trip_name,
                         input_info.trip_date,
                         input_info.vessel_name,
                         printable_filename(input_info),
                         input_info.trip_id))
    trip_cursor.close()

    # Delete previous data rows
    trip_data_del_cursor = db.cursor()
    trip_data_del_cursor.execute("DELETE FROM position "
                                 "WHERE trip_id = %s",
                                 (input_info.trip_id, ))
    trip_data_del_cursor.close()

    return (input_info, input_info.trip_id, input_info.user_id)

def load_data(context, db, input_info, trip_id):
    if input_info.input_file == "-":
        read_input(db, trip_id, input_info, sys.stdin)
    else:
        load_data_file(context, db, input_info, trip_id)

def load_data_file(context, db, input_info, trip_id):
    mimetype = magic.from_file(input_info.input_file, mime=True)
    fo = gzip.open if mimetype and mimetype == "application/x-gzip" \
        else open
    with fo(input_info.input_file) as input:
        read_input(db, trip_id, input_info, input)

def update_depth_display_ranges(db, trip_id):
    dr_cursor = db.cursor()
    dr_cursor.execute("SELECT update_depth_display_ranges(%s)",
                      (trip_id, ))
    dr_cursor.execute("SELECT update_position_display_ranges(%s)",
                      (trip_id, ))
    dr_cursor.close()

def do_file_loading(db, input_info,
                    context=None,
                    user_id=None):
    context = context or TTYContext()
    trip_id = -1

    try:
        if input_info.trip_id:
            context.log("Updating trip information (id {})"
                        .format(input_info.trip_id))
            (input_info, trip_id, user_id) = load_and_update_trip(db,
                                                                  input_info)
        else:
            input_info = augment_args(input_info)
            trip_id = setup_trip(db, input_info, user_id)
        context.log("Loading data from {} ..."
                    .format(printable_filename(input_info)))
        load_data(context, db, input_info, trip_id)
        db.commit()
        context.log("Loaded. Now performing display range modifications ...")
        update_depth_display_ranges(db, trip_id)
        db.commit()
        context.log("Done.")
        return True
    except Exception,ex:
        context.log_err("Loading data failed: {0}".format(ex));
        db.rollback()
        return False

class TTYContext:
    def log(self, msg):
        print(msg)

    def log_err(self, msg):
        sys.stderr.write("{}\n".format(msg))

class AppContext:
    def __init__(self):
        self.logmsgs = []
        self.errmsgs = []

    def log(self, msg):
        self.logmsgs.append(msg)

    def log_err(self, msg):
        self.errmsgs.append(msg)

    def get_error_msgs(self):
        if 0 == len(self.errmsgs):
            return None
        return " ".join(self.errmsgs)

    def get_log_msgs(self):
        if 0 == len(self.logmsgs):
            return None
        return " ".join(self.logmsgs)

def today():
    return time.strftime("%Y-%m-%d")

def main():
    parser = argparse.ArgumentParser(description="Read NMEA data and write it "
                                     "into database.")
    parser.add_argument('input_file', metavar="input_file",
                        type=str,
                        help="Name of input file. Use - for stdin")
    parser.add_argument('-t', '--date', dest="trip_date",
                        help="The date of this trip")
    parser.add_argument('-i', '--trip_id', dest="trip_id",
                        type=int,
                        help="Trip id for reloading data")
    parser.add_argument('-e', '--email', dest="user_email",
                        help="The e-mail address of the application user",
                        required=True)
    parser.add_argument('-n', '--name', dest="trip_name",
                        help="A name or description for the trip",
                        default='')
    parser.add_argument('-s', '--vessel', dest="vessel_name",
                        help="The name of the vessel",
                        default='')
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

    result = do_file_loading(db, input_info)

    db.close()
    sys.exit(0 if True == result else 1)

def db_conn(db_name, db_user, db_passwd):
    return psycopg2.connect("dbname={} user={} password={}"
                            .format(db_name, db_user, db_passwd))

if __name__ == "__main__":
    main()
