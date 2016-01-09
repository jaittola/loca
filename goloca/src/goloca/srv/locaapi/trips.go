package locaapi

import "strconv"

type Trips struct {
	Trips *[]Trip `json:"trips"`
}

type Trip struct {
	TId        int32  `json:"t_id"`
	TripName   string `json:"trip_name"`
	TripDate   string `json:"trip_date"`
	VesselName string `json:"vessel_name"`
	UserEmail  string `json:"user_email"`
}

func (t *Trip) fields() (*int32, *string, *string, *string, *string) {
	return &t.TId, &t.TripName, &t.TripDate, &t.VesselName, &t.UserEmail
}

var tripDataStmtBase = `SELECT
t.id AS t_id,
t.trip_name AS trip_name,
to_char(t.trip_date, 'YYYY-MM-DD') AS trip_date,
t.vessel_name AS vessel_name,
u.user_email AS user_email
FROM trip t
JOIN users u
ON t.user_id = u.id `

type TripPoints struct {
	TId        int32        `json:"trip_id"`
	TripPoints *[]TripPoint `json:"trip_points"`
}

type TripPoint struct {
	PId               int32   `json:"p_id"`
	TimeStampUTC      string  `json:"t_utc"`
	Lat               float64 `json:"lat"`
	Lon               float64 `json:"lon"`
	PosBad            bool    `json:"pos_bad"`
	WaterSpeedId      int32   `json:"ws_id"`
	WaterSpeed        float64 `json:"ws"`
	GroundSpeedId     int32   `json:"gs_id"`
	GroundSpeed       float64 `json:"gs"`
	GroundSpeedCourse float64 `json:"course"`
	GroundSpeedBad    bool    `json:"gs_bad"`
}

func (t *TripPoint) fields() (*int32, *string, *float64, *float64, *bool, *int32, *float64, *int32, *float64, *float64, *bool) {
	return &t.PId, &t.TimeStampUTC, &t.Lat, &t.Lon, &t.PosBad,
		&t.WaterSpeedId, &t.WaterSpeed,
		&t.GroundSpeedId, &t.GroundSpeed, &t.GroundSpeedCourse, &t.GroundSpeedBad
}

var tripPointStmt = `SELECT p.id AS p_id,
to_char(p.pos_time_utc, 'YYYYMMDDHH24MISS') AS t_utc,
p.latitude AS lat,
p.longitude AS lon,
p.erroneous AS pos_bad,
wsp.id AS ws_id,
wsp.speed AS ws,
gsc.id AS gs_id,
gsc.speed AS gs,
gsc.course AS course,
gsc.erroneous AS gs_bad
FROM position p
JOIN water_speed wsp ON p.id = wsp.position_id
JOIN ground_speed_course gsc ON p.id = gsc.position_id
WHERE
p.trip_id = $1
AND p.display_range >= get_display_range($2)
AND p.latitude > $3 AND p.latitude < $4
AND p.longitude > $5 AND p.longitude < $6`

func LoadTrips() (*Trips, error) {
	var tripList []Trip
	rows, err := DBConn.Pool.Query(tripDataStmtBase + " order by t.trip_date DESC")
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var trip Trip
		err = rows.Scan(trip.fields())
		if err != nil {
			rows.Close()
			return nil, err
		}
		tripList = append(tripList, trip)
	}
	return &Trips{Trips: &tripList}, nil
}

func LoadTripInfo(tripId string) (*Trip, error) {
	var trip Trip
	rows, err := DBConn.Pool.Query(tripDataStmtBase+" where t.id = $1", tripId)
	if err != nil {
		return nil, err
	}
	if rows.Next() {
		rows.Scan(trip.fields())
		rows.Close()
		return &trip, nil
	} else {
		return nil, nil
	}
}

func LoadTripPoints(tripId string, lat0 float64, lat1 float64, lon0 float64, lon1 float64, mpp float64) (*TripPoints, error) {
	tid, err := strconv.ParseInt(tripId, 10, 32)
	if err != nil {
		return nil, err
	}
	var tripPoints []TripPoint
	rows, err := DBConn.Pool.Query(tripPointStmt, tripId, mpp, lat0, lat1, lon0, lon1)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var point TripPoint
		err = rows.Scan(point.fields())
		if err != nil {
			rows.Close()
			return nil, err
		}
		tripPoints = append(tripPoints, point)
	}
	return &TripPoints{TId: int32(tid), TripPoints: &tripPoints}, nil
}
