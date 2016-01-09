package locaapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/julienschmidt/httprouter"
)

func sendJsonReply(w http.ResponseWriter, value interface{}) {
	w.Header().Add("Access-Control-Allow-Origin", "*")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		errmsg := fmt.Sprintf("Failed marshalling to JSON data: %v", err)
		log.Println(errmsg)
		http.Error(w, errmsg, 500)
		return
	}
}

func setupForm(w http.ResponseWriter, r *http.Request) bool {
	formErr := r.ParseForm()
	if formErr != nil {
		http.Error(w, "Parsing HTTP request parameters failed: %v", 400)
		return false
	}
	return true
}

func getAreaFromParams(w http.ResponseWriter, r *http.Request) (map[string]float64, bool) {
	if !setupForm(w, r) {
		return map[string]float64{}, false
	}
	params, paramErr := getFormParamsAsFloat([]string{"lat0", "lat1", "lon0", "lon1", "mPerPix"},
		&r.Form)
	if paramErr != nil {
		http.Error(w, "Query parameters lat0, lat1, lon0, lon1, mPerPix are mandatory", 400)
		return map[string]float64{}, false
	}
	return params, true
}

func getFormParamsAsFloat(paramNames []string, form *url.Values) (map[string]float64, error) {
	result := make(map[string]float64)
	for _, pname := range paramNames {
		v, err := strconv.ParseFloat(form.Get(pname), 64)
		if err != nil {
			return result, err
		}
		result[pname] = v
	}
	return result, nil
}

func databaseQueryError(w http.ResponseWriter, err error) {
	log.Printf("Database query failed: %v", err)
	http.Error(w, "Database query error", 500)
}

func tripList(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	result, err := LoadTrips()
	if err != nil {
		databaseQueryError(w, err)
		return
	}
	sendJsonReply(w, result)
}

func tripInfo(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	trip, err := LoadTripInfo(ps.ByName("tripId"))
	if err != nil {
		databaseQueryError(w, err)
		return
	}
	if trip != nil {
		sendJsonReply(w, trip)
	} else {
		http.Error(w, "Not found", 404)
	}
}

func tripPoints(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	params, ok := getAreaFromParams(w, r)
	if !ok {
		return
	}

	tripPoints, err := LoadTripPoints(ps.ByName("tripId"),
		params["lat0"], params["lat1"],
		params["lon0"], params["lon1"], params["mPerPix"])
	if err != nil {
		databaseQueryError(w, err)
		return
	}
	sendJsonReply(w, tripPoints)
}

func depthData(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	params, ok := getAreaFromParams(w, r)
	if !ok {
		return
	}

	depths, err := LoadDepthData(params["lat0"], params["lat1"],
		params["lon0"], params["lon1"], params["mPerPix"])
	if err != nil {
		databaseQueryError(w, err)
		return
	}
	sendJsonReply(w, depths)
}

func Handler(prefix string) (string, http.Handler) {
	router := httprouter.New()
	router.GET(prefix+"trips", tripList)
	router.GET(prefix+"trip/:tripId", tripInfo)
	router.GET(prefix+"trip/:tripId/points", tripPoints)
	router.GET(prefix+"depth_data", depthData)
	return prefix, router
}
