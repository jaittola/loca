
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

def db_depths_fetch(db, coord_range, m_per_pix):
    """
    Fetch depth data from the database.
    """
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT "
                "p.id as position_id, "
                "p.trip_id as trip_id,"
                "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') "
                "   as pos_time_utc, "
                "p.latitude as latitude, "
                "p.longitude as longitude, "
                "d.depth as depth, "
                "d.erroneous as erroneous "
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

def db_triplist_fetch(db):
    """
    Fetch a list of all trips from the database.

    Return most recent first.
    """
    cur = db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT "
                "t.id AS trip_id, "
                "t.trip_name AS trip_name, "
                "to_char(t.trip_date, 'YYYYMMDD') AS trip_date, "
                "t.vessel_name AS vessel_name, "
                "u.user_email AS user_email "
                "FROM trip t "
                "JOIN users u "
                "ON t.user_id = u.id "
                "ORDER BY t.trip_date DESC")
    trips = cur.fetchall()
    db.commit()
    cur.close()

    return trips

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
