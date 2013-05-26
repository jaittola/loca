
from flask import Flask, g
from flask_login import LoginManager

import os

app = Flask(__name__)

# General configuration.
app.config.from_object('flaska.flk_default_config')
if 'FLK_CONFIG' in os.environ:
    app.config.from_envvar('FLK_CONFIG')

# Set up the login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = '/login/'

import flaska.views
import flaska.api
import flaska.login_controller
import flaska.files

from flaska.depth_data import db_conn, db_disconn

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
