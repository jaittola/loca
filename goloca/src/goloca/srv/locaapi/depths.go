package locaapi

type Depths struct {
	Depths *[]Depth `json:"depths"`
}

type Depth struct {
	PId   int32   `json:"p_id"`
	TId   int32   `json:"t_id"`
	TUTC  string  `json:"t_utc"`
	Lat   float64 `json:"lat"`
	Lon   float64 `json:"lon"`
	Depth float64 `json:"depth"`
	Bad   bool    `json:"d_bad"`
}

func (d *Depth) fields() (*int32, *int32, *string, *float64, *float64, *float64, *bool) {
	return &d.PId, &d.TId, &d.TUTC, &d.Lat, &d.Lon, &d.Depth, &d.Bad
}

var depthDataQueryString = `SELECT
p.id as p_id,
p.trip_id as t_id,
to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS')
as t_utc,
p.latitude as lat,
p.longitude as lon,
d.depth as depth,
d.erroneous as d_bad
FROM position p
JOIN depth d
ON p.id = d.position_id
WHERE p.latitude > $1 and p.latitude < $2
AND p.longitude > $3 and p.longitude < $4
AND d.display_range >= get_display_range($5)
ORDER BY p.id`

func LoadDepthData(lat0 float64, lat1 float64, lon0 float64, lon1 float64, mpp float64) (*Depths, error) {
	var depthList []Depth
	rows, err := DBConn.Pool.Query(depthDataQueryString, lat0, lat1, lon0, lon1, mpp)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var depth Depth
		err = rows.Scan(depth.fields())
		if err != nil {
			rows.Close()
			return nil, err
		}
		depthList = append(depthList, depth)
	}
	return &Depths{Depths: &depthList}, nil
}
