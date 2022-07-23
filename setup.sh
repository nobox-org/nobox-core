#!/bin/bash

echo ">>> *Setting up Mongo"
mongo_container_name="nc_mongo"
mongo_image_name="ni_mongo"

if docker image inspect "$mongo_image_name"  > /dev/null 2>&1; then
    echo ">>> Image Already Exists"
    if docker container inspect "$mongo_container_name" > /dev/null 2>&1; then
        docker stop "$mongo_container_name"  2>&1 >/dev/null
        echo ">>> Stopped Container"
        docker rm -f "$mongo_container_name" 2>&1 >/dev/null
        echo ">>> Deleted Container"
    fi
else
    echo ">>> Mongo Image $mongo_image_name not found"
    echo ">>> Entering Project Docker folder to create new Mongo Image"
    cd "docker"
    echo ">>> Creating new Mongo Image"
    if docker build  -f mongo.dockerfile -t "$mongo_image_name" .; then
        echo ">>> Successfully created new Mongo Image"
        cd ".."
    else
        echo "Docker Build Failed"
        exit 1
    fi
    echo ">>> Exiting Project Docker folder"
fi
echo ">>> Running New Container based on Image"
newContainer=$(docker run --name "$mongo_container_name" -d -p 27017:27017 --env-file env/.local.env "$mongo_image_name")
echo ">>> New Container Name: $mongo_container_name"



