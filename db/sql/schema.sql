
-- DB schema for the location and depth data.
-- Runs on PostgreSQL (9.1).

-- CREATE TABLE users ()  -- TODO

-- CREATE TABLE IF NOT EXISTS trip (
--   trip_id SERIAL PRIMARY KEY,
--   user_id INTEGER NOT NULL DEFAULT 1,   -- TODO
--   trip_name text
-- );

CREATE TABLE IF NOT EXISTS position (
   position_id SERIAL PRIMARY KEY,
   pos_time_utc TIMESTAMP WITHOUT TIME ZONE NOT NULL,
   trip_id INTEGER NOT NULL DEFAULT 0,
     -- REFERENCES trip (trip_id) ON DELETE SET NULL,
   latitude DOUBLE PRECISION,
   longitude DOUBLE PRECISION
);

DROP INDEX IF EXISTS position_range_idx;
CREATE INDEX position_range_idx ON position (latitude, longitude);

CREATE TABLE IF NOT EXISTS speed (
   speed_id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (position_id) ON DELETE CASCADE,
   speed DOUBLE PRECISION NOT NULL,
   bearing DOUBLE PRECISION,
   accuracy DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS depth (
   depth_id SERIAL PRIMARY KEY,
   position_id INTEGER REFERENCES position (position_id) ON DELETE CASCADE,
   depth DOUBLE PRECISION NOT NULL,
   display_range INTEGER NOT NULL DEFAULT 0
);

DROP INDEX IF EXISTS depth_pos_id_idx;
CREATE INDEX depth_pos_id_idx ON depth (position_id);

CREATE TABLE IF NOT EXISTS display_ranges (
   range INTEGER PRIMARY KEY,
   lat_range DOUBLE PRECISION,
   lon_range DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS users (
   user_id TEXT PRIMARY KEY,
   auth_token TEXT
);
