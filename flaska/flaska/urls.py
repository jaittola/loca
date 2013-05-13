
from flask import url_for

class Urls():
    """
    An object that contains some URLs used in the app
    """
    def __init__(self, app):
        self.css = url_for("static", filename="style.css")
        self.map_utils = url_for("static", filename="map_utils.js")
        self.hsv2rgb = url_for("static", filename="hsv2rgb.js")
        self.maps_key = app.config['GOOGLE_MAPS_KEY'];
