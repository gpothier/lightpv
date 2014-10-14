#! /bin/sh

# Run this once a minute as root

su - lightpv -c ./checkupdate.sh
./checkrestart.sh

