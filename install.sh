#! /bin/sh

# Uso:
# curl https://raw.githubusercontent.com/gpothier/lightpv/master/install.sh | sh

sudo service apache2 stop

set -e

sudo adduser --disabled-login --gecos "" lightpv

curl -sL https://deb.nodesource.com/setup_0.10 | sudo bash -
sudo apt-get install -y nodejs

sudo apt-get remove apache2 apache2-bin apache2-data
sudo apt-get -y install nginx mongodb-server git

curl https://install.meteor.com | /bin/sh

sudo mkdir /opt/lightpv
sudo chown lightpv /opt/lightpv

sudo su - lightpv -c 'git clone https://github.com/gpothier/lightpv.git /opt/lightpv/src'

sudo cp /opt/lightpv/src/nginx-lightpv /etc/nginx/sites-available/lightpv
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/lightpv /etc/nginx/sites-enabled/lightpv
sudo nginx -s reload

sudo ln -s /opt/lightpv/src/lightpv.conf /etc/init/lightpv.conf

sudo su - lightpv -c '/opt/lightpv/src/rebuild.sh'

sudo touch /var/log/lightpv.log
sudo chown lightpv /var/log/lightpv.log

(
cat <<'EOF'
* * * * *       root    /opt/lightpv/src/update.sh >/var/log/lightpvupdate.log 2>&1
EOF
) | sudo tee -a /etc/crontab > /dev/null

sudo initctl reload-configuration
sudo service lightpv restart
