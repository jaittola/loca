
from flask import Flask, g
import os

app = Flask(__name__)

import flaska.views
import flaska.api

from flaska.depth_data import db_conn, db_disconn

# Configuration.
app.config.from_object('flaska.flk_default_config')
if 'FLK_CONFIG' in os.environ:
    app.config.from_envvar('FLK_CONFIG')

# Teardown and setup: connect to DB.
# Should actually use a db connection pool
# but this works well enough for now.
# Also not every call needs the db connection.

@app.before_request
def conn_to_db():
    g.db = db_conn(app.config['DB_NAME'],
                   app.config['DB_USERNAME'],
                   app.config['DB_PASSWORD'])

@app.teardown_request
def drop_db_conn(exception):
    db_disconn(g.db)
