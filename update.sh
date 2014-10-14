#! /bin/sh

set -e

# Run this once a minute as root

su - lightpv -c /opt/lightpv/src/checkupdate.sh
/opt/lightpv/src/checkrestart.sh

