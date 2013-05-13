
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
                "p.position_id as position_id, "
                "p.trip_id as trip_id,"
                "to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') "
                "   as pos_time_utc, "
                "p.latitude as latitude, "
                "p.longitude as longitude, "
                "d.depth as depth "
                "FROM position p "
                "JOIN depth d "
                "ON p.position_id = d.position_id "
                "WHERE p.latitude > %s and p.latitude < %s "
                "AND p.longitude > %s and p.longitude < %s "
                "AND d.display_range >= get_display_range(%s) "
                "ORDER BY p.position_id",
                (coord_range["lat0"], coord_range["lat1"],
                 coord_range["lon0"], coord_range["lon1"],
                 m_per_pix))

    depths = cur.fetchall()
    cur.close()

    return depths
