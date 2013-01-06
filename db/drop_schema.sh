#!/bin/bash

awk '/^CREATE TABLE IF NOT EXISTS / { print "DROP TABLE IF EXISTS " $6 ";" }' sql/schema.sql \
   | tac \
   | psql -d locadb -U loca -f -
