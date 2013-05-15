
import threading

from flaska import app
from flaska.depth_data import db_load_user
from flaska.depth_data import db_conn, db_disconn

class User:
    def __init__(self, user_email, access_token = None):
        self.user_email = user_email
        self.access_token = access_token

        self.user_is_authenticated = False

    def set_authenticated(self, is_authenticated=True):
        self.user_is_authenticated = is_authenticated

    def is_authenticated(self):
        return self.user_is_authenticated

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        return self.user_email

    def get_email(self):
        return self.user_email

    def set_access_token(self, token):
        self.access_token = token

    def get_access_token(self):
        return self.access_token

    def __repr__(self):
        return "User %s: authenticated %r" % (self.user_email,
                                              self.user_is_authenticated)

class UserSessions:
    lock = threading.Lock()
    users = {}

    @classmethod
    def load(cls, user_email):
        with cls.lock:
            user = cls.users.get(user_email)
            if user:
                return user

            # TODO, dbconn should be outside the lock.
            # TODO: set up a db conn pool

            result = None
            db = db_conn(app.config['DB_NAME'],
                         app.config['DB_USERNAME'],
                         app.config['DB_PASSWORD'])
            if not db:
                return None

            userdata = db_load_user(db, user_email)
            if userdata:
                result = User(user_email = userdata["user_email"])

            db_disconn(db)
            cls.users[user_email] = result
            return result
