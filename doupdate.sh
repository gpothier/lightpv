#! /bin/sh

# Checks if new code is available on github an restarts the service if so.
# Must be run through the update.sh wrapper.

set -e

su - lightpv -c /opt/lightpv/src/checkupdate.sh
/opt/lightpv/src/checkrestart.sh
