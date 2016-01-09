package main

import (
	"fmt"
	"log"
	"net/http"

	"goloca/srv/locaapi"
)

func main() {
	locaapi.DBConn.Setup()
	runServer(8002)
}

func runServer(port int) {
	http.Handle("/", http.FileServer(http.Dir("src/goloca/static-files/")))
	http.Handle(locaapi.Handler("/api/1/"))
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
