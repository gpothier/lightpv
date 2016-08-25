#! /bin/sh

APPDIR=/opt/lightpv
cd $APPDIR/src

echo "Pulling..."
git pull

echo "Building..."
meteor build /opt/lightpv --directory

echo "Installing modules..."
cd $APPDIR/bundle/programs/server
meteor npm install

echo `date +%s` >$APPDIR/builddate

