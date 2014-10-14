#! /bin/sh

# Run this once a minute as root
# In crontab put:
#
# PATH=/usr/sbin:/usr/bin:/sbin:/bin
# * * * * * /opt/lightpv/src/update.sh >/var/log/lightpvupdate.log 2>&1
#
# (the PATH is to provide a full environment for restarting the service,
# see http://ubuntuforums.org/showthread.php?t=2022708)

flock -n /tmp/lightpv.lock -c "/opt/lightpv/src/doupdate.sh"
