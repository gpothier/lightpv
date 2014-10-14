#! /bin/sh

# Uso: 
# curl https://raw.githubusercontent.com/gpothier/lightpv/master/install.sh | sh

set -e

sudo adduser --disabled-login --gecos "" lightpv

sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get -y install nginx mongodb-server nodejs git

curl https://install.meteor.com | /bin/sh

sudo mkdir /opt/lightpv
sudo chown lightpv /opt/lightpv

sudo su -c 'git clone https://github.com/gpothier/lightpv.git /opt/lightpv/src' - lightpv

sudo cp /opt/lightpv/src/nginx-lightpv /etc/nginx/sites-available/lightpv
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/lightpv /etc/nginx/sites-enabled/lightpv
sudo nginx -s reload

sudo ln -s /opt/lightpv/src/lightpv.conf /etc/init/lightpv.conf

sudo /opt/lightpv/src/rebuild.sh

sudo touch /var/log/lightpv.log
sudo chown lightpv /var/log/lightpv.log

(
cat <<'EOF'
* * * * *       root    /opt/lightpv/src/update.sh >/var/log/lightpvupdate.log 2>&1
EOF
) | sudo tee -a /etc/crontab > /dev/null

sudo initctl reload-configuration
sudo service lightpv restart
