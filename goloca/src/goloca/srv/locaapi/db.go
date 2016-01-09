package locaapi

import (
	"log"

	"github.com/jackc/pgx"
)

type ConnectionInfo struct {
	Pool *pgx.ConnPool
}

var DBConn ConnectionInfo

func getConfig() pgx.ConnPoolConfig {
	var err interface{}
	var connPoolConfig pgx.ConnPoolConfig

	connPoolConfig.ConnConfig, err = pgx.ParseEnvLibpq()
	if err != nil {
		log.Fatalf("Postgresql connection information missing from the environment: %v", err)
	}
	connPoolConfig.MaxConnections = 10

	return connPoolConfig
}

func (c *ConnectionInfo) Setup() {
	var err interface{}
	c.Pool, err = pgx.NewConnPool(getConfig())
	if err != nil {
		log.Fatalf("Initializing PostgreSQL connection pool failed: %v", err)
	}
}
