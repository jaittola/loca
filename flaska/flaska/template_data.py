
from flask import url_for
from flask_login import current_user

class TemplateVars():
    """
    An object that contains URLs and other state data for the templates
    """
    def __init__(self, app):
        self.css = url_for("static", filename="style.css")
        self.map_utils = url_for("static", filename="map_utils.js")
        self.hsv2rgb = url_for("static", filename="hsv2rgb.js")
        self.logout = url_for("logout")
        self.user_id = current_user.get_id()
        self.maps_key = app.config['GOOGLE_MAPS_KEY'];
