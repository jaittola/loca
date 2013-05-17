
import psycopg2
import psycopg2.extras

# This file contains postgresql-specific database code.
# Web server specific code should not end up in this file.

def db_connect_string(dbname, dbuser, dbpasswd):
    """
    Return the DB connection string.
    """
    return "dbname={} user={} password={}".format(dbname, dbuser, dbpasswd)

def db_conn(dbname, dbuser, dbpasswd):
    return psycopg2.connect(db_connect_string(dbname, dbuser, dbpasswd))

def db_disconn(db):
    db.close()

def db_rd_cursor(db):
    return db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

def db_depths_fetch(db, coord_range, m_per_pix):
    """
    Fetch depth data from the database.
    """
    cur = db_rd_cursor(db)
    cur.execute("SELECT "
                "p.id as position_id, "
                "p.trip_id as trip_id,"
                "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') "
                "   as pos_time_utc, "
                "p.latitude as latitude, "
                "p.longitude as longitude, "
                "d.depth as depth, "
                "d.erroneous as depth_erroneous "
                "FROM position p "
                "JOIN depth d "
                "ON p.id = d.position_id "
                "WHERE p.latitude > %s and p.latitude < %s "
                "AND p.longitude > %s and p.longitude < %s "
                "AND d.display_range >= get_display_range(%s) "
                "ORDER BY p.id",
                (coord_range["lat0"], coord_range["lat1"],
                 coord_range["lon0"], coord_range["lon1"],
                 m_per_pix))
    depths = cur.fetchall()
    db.commit()
    cur.close()

    return depths

def db_triplist_fetch(db, limit=10):
    """
    Fetch a list of all trips from the database.

    Return most recent first.
    """
    cur = db_rd_cursor(db)
    cur.execute("SELECT "
                "t.id AS trip_id, "
                "t.trip_name AS trip_name, "
                "to_char(t.trip_date, 'YYYY-MM-DD') AS trip_date, "
                "t.vessel_name AS vessel_name, "
                "u.user_email AS user_email "
                "FROM trip t "
                "JOIN users u "
                "ON t.user_id = u.id "
                "ORDER BY t.trip_date DESC "
                "LIMIT %s",
                (limit, ))
    trips = cur.fetchall()
    db.commit()
    cur.close()

    return trips

def db_trip_points_fetch(db, trip_id):
    cur = db_rd_cursor(db)
    cur.execute("SELECT p.id AS position_id, "
                "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') AS pos_time_utc, "
                "p.latitude AS latitude, "
                "p.longitude AS longitude, "
                "p.erroneous AS pos_erroneous, "
                "ws.id AS water_speed_id, "
                "ws.speed AS water_speed, "
                "gs.id AS ground_speed_id, "
                "gs.speed AS ground_speed, "
                "gs.course AS course, "
                "gs.erroneous AS ground_speed_erroneous "
                "FROM position p "
                "JOIN water_speed ws ON p.id = ws.position_id "
                "JOIN ground_speed_course gs ON p.id = gs.position_id "
                "WHERE p.trip_id = %s",
                (trip_id, ))
    points = cur.fetchall()
    db.commit()
    cur.close()

    return points;

def db_update_validityflags(db, position_id, depth_erroneous):
    result = True

    cur = db.cursor()
    cur.execute("UPDATE depth "
                "SET erroneous = %s "
                "WHERE position_id = %s",
                (depth_erroneous, position_id))
    if cur.rowcount != 1:
        result = False

    db.commit()
    cur.close()

    return result

def db_load_user(db, userid):
    cur = db.cursor()
    cur.execute("SELECT user_email, auth_token FROM users WHERE "
                "user_email = %s",
                (userid, ))

    userdata = cur.fetchone()

    db.commit()
    cur.close()

    if userdata is None:
        return None
    return { "user_email" : userdata[0], "auth_token": userdata[1] }
