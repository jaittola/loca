#!/usr/bin/env python

from depth_data import fetch_depths

from flkutils import Urls, db_connect_string

from flask import Flask
from flask import render_template, redirect, url_for, g

import os
import psycopg2

app = Flask(__name__)

# Configuration.
app.config.from_object('flk_default_config')
if 'FLK_CONFIG' in os.environ:
    app.config.from_envvar('FLK_CONFIG')

# Paths.
@app.route("/")
def root():
    return redirect(url_for("depth_map"))

@app.route("/depth_map/")
def depth_map():
    return render_template("map.html",
                           urls=Urls(app))

@app.route("/depth_data/")
def depth_data():
    return fetch_depths()

@app.route("/trip/<int:trip_id>")
def trip(trip_id):
    return "Requested trip {}".format(trip_id)

@app.route("/trips/")
def list_trips():
    return "Trip list"

# Teardown and setup: connect to DB.
# Should actually use a db connection pool
# but this works well enough for now.
# Also not every call needs the db connection.

@app.before_request
def conn_to_db():
    g.db = psycopg2.connect(db_connect_string(app))

@app.teardown_request
def drop_db_conn(exception):
    g.db.close()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
