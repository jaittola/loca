SELECT p.position_id, p.pos_time_utc, p.latitude, p.longitude, d.depth
FROM position p
JOIN depth d ON p.position_id = d.position_id
ORDER BY p.position_id;

