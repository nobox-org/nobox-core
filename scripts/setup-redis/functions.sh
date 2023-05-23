#!/bin/bash

cleanup_redis_container() {
    local redis_server_image_name="$1"
    local redis_server_container_name="$2"

    if docker image inspect "$redis_server_image_name" > /dev/null 2>&1; then
        echo "🤔 Redis Image Already Exists"
        if docker container inspect "$redis_server_container_name" > /dev/null 2>&1; then
            docker stop "$redis_server_container_name" > /dev/null 2>&1
            echo ">>> Stopped Redis Container"
            docker rm -f "$redis_server_container_name" > /dev/null 2>&1
            echo ">>> Deleted Redis Container"
        fi
    else
        echo ">>> Redis Image $redis_server_container_name not found"
    fi
}

install_redis(){
    local image_name="$1"
    local container_name="$2"
    local port="$3"

    echo "🙌 Installing Redis"
    docker run -d --name "$container_name" -p $port:6379 "$image_name":latest
    echo "💡 Installed Redis"
}
