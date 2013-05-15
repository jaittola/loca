
CREATE OR REPLACE FUNCTION
update_depth_display_ranges(trip_id_ INTEGER)
RETURNS void AS $$
DECLARE
    prev_lat DOUBLE PRECISION;
    prev_lon DOUBLE PRECISION;
    min_depth_id INTEGER;
    range RECORD;
    pos RECORD;
BEGIN
    FOR range IN SELECT * FROM display_ranges ORDER BY range
    LOOP
        prev_lat := NULL;
        prev_lon := NULL;

        FOR pos IN SELECT id, latitude, longitude
                       FROM position
                       WHERE trip_id = trip_id_
                       ORDER BY id
        LOOP
            IF prev_lat IS NOT NULL AND
               pos.latitude < prev_lat + range.lat_range AND
               pos.latitude > prev_lat - range.lat_range AND
               pos.longitude < prev_lon + range.lon_range AND
               pos.longitude > prev_lon - range.lon_range THEN
                   -- If the current position is within the bounds
                   -- of the coordinate range of the previous
                   -- point, continue to the next point.
                   CONTINUE;
            END IF;

            min_depth_id := get_min_depth_id(pos.latitude,
                                             pos.longitude,
                                             range.range);

            -- Note, this does an update to all depth
            -- data within the area.
            UPDATE depth
                SET display_range = range.range
                WHERE id = min_depth_id;

            prev_lat := pos.latitude;
            prev_lon := pos.longitude;
        END LOOP;
    END LOOP;
END;
$$
LANGUAGE plpgsql;


-- Return the display range closest to the meters/pixel value
-- provided by the client.
CREATE OR REPLACE FUNCTION
get_display_range(meters_per_pixel DOUBLE PRECISION)
RETURNS INTEGER
AS $$
    SELECT COALESCE(MAX(range), 0)
        FROM display_ranges
        WHERE range < $1;
$$
LANGUAGE SQL;


-- Get the depth_id of the row that has the
-- smallest depth within an area.
CREATE OR REPLACE FUNCTION
get_min_depth_id(center_latitude DOUBLE PRECISION,
                 center_longitude DOUBLE PRECISION,
                 display_range INTEGER)
RETURNS INTEGER
AS $$
    WITH depths AS (SELECT id AS depth_id,
                    depth,
                    row_number() OVER (ORDER BY depth) AS rnum
                    FROM depth
                    WHERE position_id IN (SELECT * FROM
                                          get_positions_in_area($1, $2, $3)))
    SELECT depth_id FROM depths WHERE rnum = 1;
$$
LANGUAGE SQL;


-- Select position IDs that are within an area defined by
-- center_latitude, center_longitude, and display_range, which refers
-- to the display_ranges table.
CREATE OR REPLACE FUNCTION
get_positions_in_area(center_latitude DOUBLE PRECISION,
                      center_longitude DOUBLE PRECISION,
                      display_range INTEGER)
RETURNS SETOF integer AS $$
DECLARE
   lat_diff DOUBLE PRECISION;
   lon_diff DOUBLE PRECISION;
BEGIN
   SELECT lat_range/2.0, lon_range/2.0
          INTO lat_diff, lon_diff
          FROM display_ranges
          WHERE range = display_range;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bad depth range %', display_range;
    END IF;

    RETURN QUERY SELECT id FROM position
           WHERE latitude >= (center_latitude - lat_diff)
           AND latitude <= (center_latitude + lat_diff)
           AND longitude >=  (center_longitude - lon_diff)
           AND longitude <= (center_longitude + lon_diff);
END;
$$
LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION calc_display_range(range INTEGER)
RETURNS VOID AS $$
DECLARE
    range_to_lat DOUBLE PRECISION;
BEGIN
    -- The hard-coding is uncool but for now like this.
    -- The magic range_to_lat converts range (meters)
    -- into latitude degrees.
    --
    -- The longitude conversion is currently fixed to
    -- 60° latitude where the length of a longitude
    -- degree is 1/2 of the latitude (cos 60°).
    range_to_lat = 111317;

    INSERT INTO display_ranges (range, lat_range, lon_range)
        VALUES (range, range / range_to_lat, range / (range_to_lat * 2.0));
END;
$$
LANGUAGE plpgsql;
