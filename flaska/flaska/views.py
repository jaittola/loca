
from flask import render_template, redirect, url_for

from flaska import app
from urls import Urls

@app.route("/")
def root():
    return redirect(url_for("depth_map"))

@app.route("/views/depth_map/")
def depth_map():
    return render_template("map.html",
                           urls=Urls(app))
