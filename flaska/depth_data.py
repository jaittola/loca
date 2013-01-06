
from flask import g, request, Response, abort

import json
import psycopg2.extras

def fetchCoordinates(args):
    lat0 = request.args.get("lat0", type=float)
    lon0 = request.args.get("lon0", type=float)
    lat1 = request.args.get("lat1", type=float)
    lon1 = request.args.get("lon1", type=float)

    if None in (lat0, lon0, lat1, lon1):
        abort(400)

    # Check that the range makes sense: don't permit
    # an area where the sw corner is not to the
    # sw of the ne corner.
    if lat0 >= lat1 or lon0 >= lon1:
        abort(400)

    return {"lat0": lat0,
            "lat1": lat1,
            "lon0": lon0,
            "lon1": lon1}


def fetch_depths():
    """
    Fetch depth data from the database.
    """
    coords = fetchCoordinates(request.args)

    cur = g.db.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
                (coords["lat0"], coords["lat1"],
                 coords["lon0"], coords["lon1"],
                 request.args.get("mPerPix", default=0, type=float)))

    depths = cur.fetchall()
    cur.close()

    return Response(json.dumps({ "depths": depths }),
                    status=200,
                    mimetype="application/json")
