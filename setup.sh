#!/bin/bash


## Warn about the root directory naming
#if [ "${PWD##*/}" != "simple-url-shortener" ]; then
#    if [ "${PWD##*/}" == "simple-url-shortener-modding" ]; then
#        echo -e "Warning: You are now using modding branch. Switch to main branch if you are not developing.\n"
#        echo -e "You'll need to build the files yourself according to README.md\n"
#    else
#        echo "Warning: You are either not in the simple-url-shortener directory or the naming of the root directory isn't \"simple-url-shortener\""
#        echo -e "\nPlease stay in the simple-url-shortener directory(mandatory) or rename the root directory to \"simple-url-shortener\"(suggestion).\n"
#    fi
#
#    read -r -p "Do you want to continue (yes/no): " confirm
#    if [ "$confirm" == "no" ]; then
#        echo -e "Exiting...\n"
#        exit 1
#    fi
#fi

#
## Check current directory
#if [ ! -f "docker/web/index.html" ] || [ ! -f "docker/backend/app.py" ]; then
#    echo "Sorry, you must be in the simple-url-shortener directory that is downloaded from the github page release."
#    exit 1
#fi


# Prompt if user is here to reset password
if [ "$(docker ps -aq -f name=simple-url-shortener)" ]; then
  echo ""
  read -r -p "Are you here for resetting admin password (yes/no): " confirm
  if [ "$confirm" == "yes" ]; then
    echo "1" > docker/backend/is_reset_password.txt
    echo -e "Password reset!\n"
    echo -e "Restarting the service, please wait patiently...\n"
    docker restart simple-url-shortener-nginx
    docker restart simple-url-shortener-python
    echo -e "Exiting...\n"
    exit 0
  fi
fi


# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo -e "\nDocker not found on your system, or it just simply lacks the sudo power."
    echo "Please install docker."
    exit 1
fi


# Check if existing service is already installed on docker
if [ "$(docker ps -aq -f name=simple-url-shortener)" ]; then
    echo ""
    read -r -p "There is an existing one, do you want to reinstall and reconfigure it? (yes/no): " confirm
    if [ "$confirm" == "yes" ]; then
        echo -e "\nStopping, please wait patiently..."
        docker stop simple-url-shortener-nginx
        docker stop simple-url-shortener-python
        docker rm simple-url-shortener-nginx
        docker rm simple-url-shortener-python
    else
        echo -e "Exiting...\n"
        exit 1
    fi
fi


# Check if docker compose is installed
if ! command -v docker compose &> /dev/null
then
    echo -e "\nDocker compose not found on your system."
    echo "Please install docker compose."
    exit 1
fi


# Check if openssl is installed
if ! command -v openssl &> /dev/null
then
    echo -e "\nOpenSSL not found on your system."
    echo "Please install docker compose."
    exit 1
fi


# Generate .env and set baseurl and link it to docker/web/.env and docker/backend/.env
echo -e "\nPlease enter the base URI that is used to show on the webpage of the generated link (including https:// or http:// and the port number behind if not 80 or 443)."
echo -e "If you are routing this through a proxy, you should enter the proxied information.\n"
echo -e "Please note that the default port of is 8880, if you are using a different port, you should change it in the docker-compose.yml file.\n"
read -r -p "Please enter: " baseurl
echo "BASE_URL=$baseurl" > docker/backend/.env
echo "hostname: \"$baseurl\"" > docker/web/conf.yaml


# Remove old database
rm -f docker/backend/data.db


# Generate is_reset_password.txt
echo "0" > docker/backend/is_reset_password.txt


# Generate ALLOWED_ORIGINS
echo "ALLOWED_ORIGINS=$baseurl" >> docker/backend/.env


# Generate SECRET_KEY
echo "SECRET_KEY=$(openssl rand -hex 64)" >> docker/backend/.env


# Generate bearer_token
TOKEN=$(openssl rand -hex 16)
echo "BEARER_TOKEN=$TOKEN" >> docker/backend/.env
echo "TOKEN=$TOKEN" > token.txt


# Copy dictionary
cp -r dictionary.txt docker/backend/


# Set permission
chmod -R 777 docker


# Docker compose up
docker compose up --build -d


# Finished message
echo -e "\nInstallation finished!"
