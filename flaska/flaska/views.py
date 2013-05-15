
from flask import render_template, redirect, url_for, request
from flask_login import login_required

from flaska import app
from flaska.template_data import TemplateVars

@app.route("/")
def root():
    return redirect(url_for("trip_map"))

@app.route("/depth_map/")
@login_required
def depth_map():
    return render_template("map.html",
                           vars=TemplateVars(app))

@app.route("/trip_map/")
def trip_map():
    return render_template("map.html",
                           vars=TemplateVars(app))

@app.route("/unauthorized")
def unauthorized_user():
    return render_template("unauthorized.html")
