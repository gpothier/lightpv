#! /bin/sh

export PATH=/opt/local/bin:/opt/local/sbin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export NODE_PATH=/usr/lib/nodejs:/usr/lib/node_modules:/usr/share/javascript
# set to home directory of the user Meteor will be running as
export PWD=/opt/lightpv
export HOME=/opt/lightpv
# leave as 127.0.0.1 for security
export BIND_IP=127.0.0.1
# the port nginx is proxying requests to
export PORT=3000
# this allows Meteor to figure out correct IP address of visitors
export HTTP_FORWARDED_COUNT=1
# MongoDB connection string using todos as database name
export MONGO_URL=mongodb://localhost:27017/todos
# The domain name as configured previously as server_name in nginx
export ROOT_URL=http://localhost
# optional JSON config - the contents of file specified by passing "--settings" parameter to meteor command in development mode
export METEOR_SETTINGS='{}'
# this is optional: http://docs.meteor.com/#email
# commented out will default to no email being sent
# you must register with MailGun to have a username and password there
# export MAIL_URL=smtp://postmaster@mymetorapp.net:password123@smtp.mailgun.org
# alternatively install "apt-get install default-mta" and uncomment:
# export MAIL_URL=smtp://localhost
export NODE_TLS_REJECT_UNAUTHORIZED=0
export LIGHTPV_SERVER=https://lightpv-server.luki.cl:7400

. /etc/default/docflow
export PATH=$NODE_HOME:$PATH

exec node /opt/lightpv/bundle/main.js >> /var/log/lightpv.log 2>&1
