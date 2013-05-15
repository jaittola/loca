#!/bin/bash

awk '/^CREATE TABLE IF NOT EXISTS / { print "DROP TABLE IF EXISTS " $6 " CASCADE;" }' sql/schema.sql \
   | psql -d locadb -U loca -f -
