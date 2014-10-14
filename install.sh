#! /bin/sh

# Uso: 
# curl https://raw.githubusercontent.com/gpothier/lightpv/master/install.sh | sh

set -e

sudo adduser --disabled-login lightpv

sudo add-apt-repository -y ppa:chris-lea/node.js
sudo apt-get update
sudo apt-get -y install nginx mongodb-server nodejs git

sudo mkdir /opt/lightpv
sudo chown lightpv /opt/lightpv

cd /opt/lightpv
sudo su - lightpv -c git -- clone https://github.com/gpothier/lightpv.git src

sudo cp /opt/lightpv/src/nginx-lightpv /etc/nginx/sites-available/lightpv
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/lightpv /etc/nginx/sites-enabled/lightpv
sudo nginx -s reload

sudo ln -s /opt/lightpv/src/lightpv.conf /etc/init/lightpv.conf

(
cat <<'EOF'
* * * * *       root    /opt/lightpv/src/update.sh >/var/log/lightpvupdate.log 2>&1
EOF
) sudo tee -a /etc/crontab > /dev/null

