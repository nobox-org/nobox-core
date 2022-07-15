#!/bin/bash

echo "Setting up Mongo"
cd docker
mongo_container="n_mongo"
mongo_image="mongo"
if docker ps | awk -v app="$mongo_container" 'NR > 1 && $NF == app{ret=1; exit} END{exit !ret}'; then
  docker stop "$mongo_container" && docker rm -f "$mongo_container"
  echo "Deleting old Mongo container"
fi
docker run --name "$mongo_container" -d -p 27017:27017 --env-file ../env/.local.env mongo
cd ..
