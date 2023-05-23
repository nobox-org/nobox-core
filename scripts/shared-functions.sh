#!/bin/bash

assert_docker_existence(){
    echo ">>> Checking if Docker is installed"
    if [[ $(which docker) && $(docker --version) ]]; then
        echo "🔥 Cool! Docker is already installed"
    else
        echo "Docker is not installed"
        exit 1;
    fi
}

assert_docker_running_status(){
    echo ">>> Checking if Docker is running"
    if (! docker stats --no-stream > /dev/null 2>&1; ); then
        echo "Docker is not running, Please start it"
        exit 1;
    else
        echo "🔥 Cool! Docker is already running"
    fi
}

get_docker_host_ip(){
    local container_name="$1"
    echo $(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$container_name")
}
