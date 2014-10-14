#! /bin/sh

START_DATE=`cat /opt/lightpv/startdate`
BUILD_DATE=`cat /opt/lightpv/builddate`

set -e

echo "Start: $START_DATE"
echo "Build: $BUILD_DATE"

if [ "0$BUILD_DATE" -gt "0$START_DATE" ]
then
	echo "Restarting"
	service lightpv restart
	date +%s >/opt/lightpv/startdate
else
	echo "Not rebuilt since last restart"
fi
