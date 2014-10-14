#! /bin/sh

# Run this once a minute as root

sudo -u lightpv ./checkupdate.sh
./checkrestart.sh

