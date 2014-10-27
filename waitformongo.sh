#! /bin/sh

while :
do
	echo "Trying to connecto to MongoDB..."
	mongo local --eval 'db.startup_log.findOne()._id'
	if [ $? -eq 0 ]
	then
		break
	fi
	sleep 1
done
echo "MongoDB seems to have started"

