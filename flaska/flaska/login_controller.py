
from urllib2 import Request, urlopen, URLError
import json

from flask import g, redirect, render_template, request, url_for
from flask_login import login_user, logout_user, current_user
from flask_oauth import OAuth

from flaska import login_manager, app
from flaska.user_sessions import User, UserSessions

oauth = OAuth()
google = oauth.remote_app("google",
                          base_url = "https://www.google.com/accounts",
                          authorize_url='https://accounts.google.com/o/oauth2/auth',
                          request_token_url=None,
                          request_token_params={'scope': 'https://www.googleapis.com/auth/userinfo.email',
                                                'response_type': 'code'},
                          access_token_url='https://accounts.google.com/o/oauth2/token',
                          access_token_method='POST',
                          access_token_params={'grant_type': 'authorization_code'},
                          consumer_key=app.config['GOOGLE_CLIENT_ID'],
                          consumer_secret=app.config['GOOGLE_CLIENT_SECRET'])

GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

@app.route("/login/")
def login():
    return google.authorize(callback=url_for('auth_callback',
                                             _external=True))
@app.route("/logout/")
def logout():
    if current_user.is_authenticated():
        current_user.set_authenticated(False)
        logout_user()
    return redirect(url_for("root"))

@app.route("/auth/oauth2callback")
@google.authorized_handler
def auth_callback(resp):
    access_token = resp['access_token']
    # Check the access token by fetching user info.
    google_user_info = fetch_google_user_info(access_token)
    if google_user_info:
        email = google_user_info.get("email")
        if email:
            user = UserSessions.load(email)
            if user:
                user.set_authenticated()
                user.set_access_token(access_token)
                # This is flask-login's login method.
                login_user(user)
                return redirect(url_for("root"))
    # Otherwise this user is not known and access is not allowed.
    return redirect(url_for("unauthorized_user"))

@google.tokengetter
def get_access_token():
    return current_user.get_access_token()

@login_manager.user_loader
def load_user(userid):
    return UserSessions.load(userid)

def fetch_google_user_info(access_token):
    req = Request(GOOGLE_USER_INFO_URL,
                  None,
                  {'Authorization': 'OAuth ' +access_token})
    try:
        res = urlopen(req)
        return json.load(res)
    except URLError, e:
        print "Fail: " + e
        return None
