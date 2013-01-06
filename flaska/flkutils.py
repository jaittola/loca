
from flask import url_for

class Urls():
    """
    An object that contains some URLs used in the app
    """
    def __init__(self, app):
        self.css = url_for("static", filename="style.css")
        self.map_utils = url_for("static", filename="map_utils.js")
        self.maps_key = app.config['GOOGLE_MAPS_KEY'];

def db_connect_string(app):
    """
    Return the DB connection string.
    """
    return "dbname={} user={} password={}" \
        .format(app.config['DB_NAME'],
                app.config['DB_USERNAME'],
                app.config['DB_PASSWORD'])
