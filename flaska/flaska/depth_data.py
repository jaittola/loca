
import psycopg2
import psycopg2.extras

# This file contains postgresql-specific database code.
# Web server specific code should not end up in this file.

trip_data_stmt_base = "SELECT " \
"t.id AS t_id, " \
"t.trip_name AS trip_name, " \
"to_char(t.trip_date, 'YYYY-MM-DD') AS trip_date, " \
"t.vessel_name AS vessel_name, " \
"u.user_email AS user_email " \
"FROM trip t " \
"JOIN users u " \
"ON t.user_id = u.id "

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
                "p.id as p_id, "
                "p.trip_id as t_id,"
                "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') "
                "   as t_utc, "
                "p.latitude as lat, "
                "p.longitude as lon, "
                "d.depth as depth, "
                "d.erroneous as d_bad "
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
    cur.execute(trip_data_stmt_base +
                "ORDER BY t.trip_date DESC ")
# \
#                "LIMIT %s",
#                (limit, ))
    trips = cur.fetchall()
    db.commit()
    cur.close()

    return trips

def db_trip_points_fetch(db,
                         trip_id,
                         coord_range,
                         m_per_pix):
    bind_tuple = (trip_id,
                  m_per_pix)
    coord_range_cond = ""

    if coord_range:
        coord_range_cond = \
            "p.latitude > %s and p.latitude < %s " \
            "AND p.longitude > %s and p.longitude < %s AND "
        bind_tuple = (coord_range["lat0"], coord_range["lat1"],
                      coord_range["lon0"], coord_range["lon1"],
                      trip_id,
                      m_per_pix)

    query = "SELECT p.id AS p_id, " \
        "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') AS t_utc, " \
        "p.latitude AS lat, " \
        "p.longitude AS lon, " \
        "p.erroneous AS pos_bad, " \
        "wsp.id AS ws_id, " \
        "wsp.speed AS ws, " \
        "gsc.id AS gs_id, " \
        "gsc.speed AS gs, " \
        "gsc.course AS course, " \
        "gsc.erroneous AS gs_bad " \
        "FROM position p " \
        "JOIN water_speed wsp ON p.id = wsp.position_id " \
        "JOIN ground_speed_course gsc ON p.id = gsc.position_id " + \
        "WHERE " + \
        coord_range_cond + \
        "p.trip_id = %s " \
        "AND p.display_range >= get_display_range(%s) "

    cur = db_rd_cursor(db)
    cur.execute(query, bind_tuple)
    points = cur.fetchall()
    db.commit()
    cur.close()

    return points;

def db_trip_info_fetch(db, trip_id):
    """Fetch info for one trip from the database."""

    cur = db_rd_cursor(db)
    cur.execute(trip_data_stmt_base +
                "WHERE t.id = %s",
                (trip_id, ))
    trip_info = cur.fetchone()

    db.commit()
    cur.close()

    return trip_info

def db_trip_info_update(db, trip_id, trip_name, trip_date, vessel_name):
    """Update trip info."""
    result = True
    cur = db.cursor()
    cur.execute("UPDATE trip SET "
                "trip_name = %s, "
                "trip_date = %s, "
                "vessel_name = %s "
                "WHERE id = %s",
                (trip_name, trip_date, vessel_name, trip_id))
    result = True if cur.rowcount == 1 else False

    db.commit()
    cur.close()

    return result

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
