select position_id from position
where latitude >= (59.8712 - 3.59e-05) and latitude <= (59.8712 + 3.59e-5)
and longitude >= 23.3463833333 - 1.13e-11 and longitude <= 23.3463833333 + 1.13e-11;



with depths as (select depth_id, depth, row_number()
                over (order by depth)  as rnum
                from depth)
select depth_id from depths where rnum=1;


with depths as (select depth_id, depth, row_number()
                over (order by depth) as rnum
                from depth where
                position_id in (SELECT * FROM
                                get_positions_in_area(59.8172, 23.346383333, 4)))
select depth_id from depths where rnum = 1;


select position_id from position
                                where latitude >= (59.8712 - 3.59e-05)
                                and latitude <= (59.8712 + 3.59e-5)
                                and longitude >=  23.3463833333 - 1.13e-11
                                and longitude <= 23.3463833333 + 1.13e-11))


SELECT position_id FROM position
           WHERE latitude >= (59.8716666667 - 0.000898)
           AND latitude <= (59.8716666667 + 0.000898)
           AND longitude >=  (23.3457833333 - 2.82e-10)
           AND longitude <= (23.3457833333 + 2.82e-10);
