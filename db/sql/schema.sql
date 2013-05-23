
-- DB schema for the location and depth data.
-- Runs on PostgreSQL (9.1).

CREATE TABLE IF NOT EXISTS users (
   id SERIAL PRIMARY KEY,
   user_email TEXT UNIQUE,
   auth_token TEXT
);

CREATE TABLE IF NOT EXISTS trip (
   id SERIAL PRIMARY KEY,
   user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE SET NULL,
   trip_name TEXT,
   trip_date DATE,
   vessel_name TEXT
);

CREATE TABLE IF NOT EXISTS position (
   id SERIAL PRIMARY KEY,
   pos_time_utc TIMESTAMP WITHOUT TIME ZONE NOT NULL,
   trip_id INTEGER NOT NULL REFERENCES trip (id)
      ON DELETE CASCADE,
   latitude DOUBLE PRECISION,
   longitude DOUBLE PRECISION,
   display_range INTEGER NOT NULL DEFAULT 0,
   erroneous BOOLEAN NOT NULL DEFAULT FALSE
);

DROP INDEX IF EXISTS position_range_idx;
CREATE INDEX position_range_idx ON position (latitude, longitude,
                                             trip_id);

CREATE TABLE IF NOT EXISTS ground_speed_course (
   id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (id) ON DELETE CASCADE,
   speed DOUBLE PRECISION NOT NULL,  -- kn
   course DOUBLE PRECISION,          -- degrees
   erroneous BOOLEAN NOT NULL DEFAULT FALSE
);

DROP INDEX IF EXISTS ground_speed_pos_id_idx;
CREATE INDEX ground_speed_pos_id_idx ON ground_speed_course (position_id);

CREATE TABLE IF NOT EXISTS water_speed (
   id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (id) ON DELETE CASCADE,
   speed DOUBLE PRECISION NOT NULL,  -- kn
   erroneous BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX water_speed_pos_id_idx ON water_speed (position_id);

CREATE TABLE IF NOT EXISTS depth (
   id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (id) ON DELETE CASCADE,
   depth DOUBLE PRECISION NOT NULL,   -- m
   display_range INTEGER NOT NULL DEFAULT 0,
   erroneous BOOLEAN NOT NULL DEFAULT FALSE
);

DROP INDEX IF EXISTS depth_pos_id_idx;
CREATE INDEX depth_pos_id_idx ON depth (position_id);

CREATE TABLE IF NOT EXISTS wind (
   id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (id) ON DELETE CASCADE,
   speed DOUBLE PRECISION NOT NULL,
   angle INTEGER NOT NULL,
   true_apparent SMALLINT NOT NULL  -- true wind 1, apparent wind 0
);

CREATE TABLE IF NOT EXISTS display_ranges (
   range INTEGER PRIMARY KEY,
   lat_range DOUBLE PRECISION,
   lon_range DOUBLE PRECISION
);
