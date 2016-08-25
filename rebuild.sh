#! /bin/sh

NODE_HOME=/home/lightpv/.meteor/packages/meteor-tool/1.1.10/mt-os.linux.x86_64/dev_bundle/bin/
[ -f /etc/default/lightpv ] && . /etc/default/lightpv
export PATH=$NODE_HOME:$PATH

APPDIR=/opt/lightpv
cd $APPDIR/src

echo "Pulling..."
git pull

echo "Building..."
meteor build /opt/lightpv --directory

echo "Installing modules..."
cd $APPDIR/bundle/programs/server
npm install

echo `date +%s` >$APPDIR/builddate

