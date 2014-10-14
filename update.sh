#! /bin/sh
flock -n /tmp/lightpv.lock -c "/opt/lightpv/src/doupdate.sh"
