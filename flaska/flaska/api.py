
import json

from flask import g, request, Response, abort
from flask_login import login_required

from depth_data import db_conn, db_disconn
from depth_data import db_depths_fetch, db_triplist_fetch, \
    db_update_validityflags, db_trip_points_fetch
from flaska import app

@app.route("/api/1/depth_data/")
@login_required
def depth_data():
    coord_range = fetch_coord_range(mandatory=True)
    depths = db_depths_fetch(g.db,
                             coord_range,
                             request.args.get("mPerPix", default=0, type=float))
    return json_response({ "depths": depths })

@app.route("/api/1/trip/<int:trip_id>")
def trip(trip_id):
    trip_points = db_trip_points_fetch(g.db, trip_id)
    return json_response( { "trip_id": trip_id,
                            "points": trip_points } )

@app.route("/api/1/trip/")
def list_trips():
    limit = request.args.get("limit", type=int, default=10)
    triplist = db_triplist_fetch(g.db, limit=limit)
    return json_response({ "trips": triplist })

@app.route("/api/1/measurement/<int:position_id>", methods=["POST"])
@login_required
def update_measurement(position_id):
    if request.json is None:
        print "NO JSON"
        abort(400)

    depth_erroneous = request.json.get("depth_erroneous")
    if depth_erroneous is None or depth_erroneous not in (True, False):
        abort(400)

    if not db_update_validityflags(g.db, position_id,
                                   depth_erroneous=depth_erroneous):
        abort(404)

    # Success
    return "";

def json_response(json_content, status=200):
    return Response(json.dumps(json_content, ensure_ascii=False),
                    status=status,
                    mimetype="application/json")

def fetch_coord_range(mandatory=False):
    """
    Pick the latitude range from the request.

    This function should be moved to a helper module.
    """
    lat0 = request.args.get("lat0", type=float)
    lon0 = request.args.get("lon0", type=float)
    lat1 = request.args.get("lat1", type=float)
    lon1 = request.args.get("lon1", type=float)

    if None in (lat0, lon0, lat1, lon1):
        if mandatory:
            abort(400)
        return None

    # Check that the range makes sense: don't permit
    # an area where the sw corner is not to the
    # sw of the ne corner.
    if lat0 >= lat1 or lon0 >= lon1:
        abort(400)

    return {"lat0": lat0,
            "lat1": lat1,
            "lon0": lon0,
            "lon1": lon1}
