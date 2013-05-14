
import json

from flask import g, request, Response
from flask_login import login_required

from depth_data import db_conn, db_disconn
from depth_data import db_depths_fetch
from flaska import app

@app.route("/api/1/depth_data/")
@login_required
def depth_data():
    coord_range = fetch_coord_range()
    depths = db_depths_fetch(g.db,
                             coord_range,
                             request.args.get("mPerPix", default=0, type=float))
    return Response(json.dumps({ "depths": depths }),
                    status=200,
                    mimetype="application/json")

@app.route("/api/1/trip/<int:trip_id>")
def trip(trip_id):
    return "Requested trip {}".format(trip_id)

@app.route("/api/1/trips/")
def list_trips():
    return "Trip list"

def fetch_coord_range():
    """
    Pick the latitude range from the request.

    This function should be moved to a helper module.
    """
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
