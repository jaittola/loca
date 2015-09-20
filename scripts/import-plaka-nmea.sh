#!/bin/bash

usage() {
    echo "Usage: $0 {-l [path to nmea_file_loader.py]} [input files]"
    exit 1
}

require_atleast_1_arg() {
    if [ $# -lt 1 ] ; then
        usage
    fi
}

import_file() {
    set -x
    local nmea_file_loader="$1"
    local f="$2"

    datestamp=`echo $f|sed -E 's,^.*nmea-log.([0-9]{4})([0-9]{2})([0-9]{2})(.*),\1-\2-\3,'`
    # Note, resulting date stamp format check missing.
    PGHOST=/tmp "$nmea_file_loader" -t "$datestamp" -e jaittola@gmail.com -n "$datestamp" -s "S/Y Pläkä" -d locadb -u loca "$f"
    if [ 0 -ne $? ] ; then
        exit 1
    fi
}

main() {
    require_atleast_1_arg "$@"

    local nmea_file_loader="../flaska/flaska/nmea_file_loader.py"
    if [ "$1" = "-l" ]; then
        shift
        nmea_file_loader="$1"
        if [ -z "$nmea_file_loader" ] ; then usage; fi
    fi

    require_atleast_1_arg "$@"
    echo "$@"

    for f in "$@"; do import_file "$nmea_file_loader" "$f"; done
}

main "$@"
