#! /bin/sh

echo "Pulling..."
git pull

echo "Building..."
meteor build /opt/lightpv --directory

echo "Installing modules..."
cd $APPDIR/bundle/programs/server
npm install

echo `date +%s` >$APPDIR/builddate

