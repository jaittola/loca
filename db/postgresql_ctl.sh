#!/bin/bash -e

if [ $# -lt 2 ] ; then
    echo "Usage: $0 [postgresql data directory] [action]"
    exit 1
fi

pg_dir="$1"
action="$2"

datadir="`dirname $pg_dir`"
logdir="${datadir}/logs/"
pg_log="${logdir}/postgresql.log"

if [ ! -d "$logdir" ] ; then
    mkdir -p "$logdir" || exit 1
fi

pg_ctl -D "$pg_dir" -l "$pg_log" -w "$action"
