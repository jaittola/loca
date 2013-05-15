
from flask import url_for
from flask_login import current_user

class TemplateVars():
    """
    An object that contains URLs and other state data for the templates
    """
    def __init__(self, app):
        self.css = url_for("static", filename="style.css")
        self.shortcut_icon = url_for("static", filename="favicon.ico")
        self.map_utils = url_for("static", filename="map_utils.js")
        self.hsv2rgb = url_for("static", filename="hsv2rgb.js")
        self.logout = url_for("logout")
        self.login = url_for("login")
        self.root = url_for("root")
        self.depth_map = url_for("depth_map")
        self.trip_map = url_for("trip_map")
        self.user_email = current_user.get_email() \
            if current_user.is_authenticated() \
            else None
        self.maps_key = app.config['GOOGLE_MAPS_KEY'];
