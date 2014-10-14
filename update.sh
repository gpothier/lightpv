#! /bin/sh

APPDIR=/opt/lightpv

REMOTE_HEAD=`git ls-remote https://github.com/gpothier/lightpv.git HEAD|head -n 1|awk '{print $1}'`

cd $APPDIR/src
CURRENT_HEAD=`git log -n 1|head -n 1|awk '{print $2}'`

echo "Remote:  $REMOTE_HEAD"
echo "Current: $CURRENT_HEAD"

if [ "$REMOTE_HEAD" = "$CURRENT_HEAD" ]
then
	echo "Already at last revision"
	exit 0
fi

echo "Pulling..."
git pull

echo "Building..."
meteor build /opt/lightpv --directory

echo "Installing modules..."
cd $APPDIR/bundle/programs/server
npm install

echo `date +%s` >$APPDIR/builddate
