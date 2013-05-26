
import hashlib
import os
import random

from flask import render_template, redirect, url_for, request, g, abort
from flask_login import login_required, current_user
from flask.ext.wtf import Form, FileField, FileRequired

from wtforms import TextField, validators

from werkzeug.datastructures import FileStorage

from flaska import app
from flaska.template_data import TemplateVars
from flaska.nmea_file_loader import do_file_loading, AppContext

class FileUploadForm(Form):
    trip_name = TextField("Name for the trip",
                          validators=[validators.length(min=4,
                                                        max=100)])
    trip_date = TextField("Date of the trip (YYYY-MM-DD)",
                          validators=[
            validators.length(10),
            validators.regexp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
                              message="Date format is YYYY-MM-DD.")])
    vessel_name = TextField("Name of the vessel",
                          validators=[validators.length(min=2,
                                                        max=60)])
    data_file = FileField("The GPS data file",
                          validators=[FileRequired("File is mandatory.")])


class InputInfo:
    def __init__(self,
                 user_email,
                 input_file,
                 trip_name,
                 trip_date,
                 vessel_name):
        self.user_email = user_email
        self.input_file = input_file
        self.trip_name = trip_name
        self.trip_date = trip_date
        self.vessel_name = vessel_name

@app.route("/upload/", methods=['GET', 'POST'])
@login_required
def upload_form():
    success_msg = None
    app_ctx = AppContext()

    form = FileUploadForm()
    if form.validate_on_submit():
        (filename, output_f) = generate_file(app.config["NMEA_FILE_UPLOAD_DIR"])
        if not filename:
            abort(500)
        form.data_file.data.save(output_f)
        output_f.close()

        if do_file_loading(app_ctx,
                           g.db,
                           # TODO, should user user's id directly
                           # and not e-mail.
                           InputInfo(user_email=current_user.get_email(),
                                     input_file=filename,
                                     trip_name=form.trip_name.data,
                                     trip_date=form.trip_date.data,
                                     vessel_name=form.vessel_name.data)):
            success_msg = "File uploaded successfully"

    return render_template("upload_form.html",
                           success_msg=success_msg,
                           error_msg=app_ctx.error_msg(),
                           form=form,
                           vars=TemplateVars(app))

def generate_file(dirname):
    h = hashlib.new('sha1')
    sr = random.SystemRandom()

    for loop in xrange(1, 10):
        h.update(str(sr.getrandbits(2048)))
        filename = "{}/{}".format(dirname, h.hexdigest())
        fd = os.open(filename, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0644)
        if fd:
            return (filename, os.fdopen(fd, "w"))

    return (None, None)
