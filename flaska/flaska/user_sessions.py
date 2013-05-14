
import threading

from flaska import app
from flaska.depth_data import db_load_user
from flaska.depth_data import db_conn, db_disconn

class User:
    def __init__(self, userid, access_token = None):
        self.user_id = userid
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
        return self.user_id

    def set_access_token(self, token):
        self.access_token = token

    def get_access_token(self):
        return self.access_token

    def __repr__(self):
        return "User %s: authenticated %r" % (self.user_id,
                                              self.user_is_authenticated)

class UserSessions:
    lock = threading.Lock()
    users = {}

    @classmethod
    def load(cls, userid):
        with cls.lock:
            user = cls.users.get(userid)
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

            userdata = db_load_user(db, userid)
            if userdata:
                result = User(userid = userdata["user_id"])

            db_disconn(db)
            cls.users[userid] = result
            return result
