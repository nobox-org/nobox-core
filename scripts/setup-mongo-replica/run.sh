#!/bin/bash

. ./scripts/shared-functions.sh

. ./scripts/setup-mongo-replica/args.sh

. ./scripts/setup-mongo-replica/functions.sh

load_environment_variables "./scripts/setup-mongo-replica/resources/.env"

create_docker_network "$NETWORK_NAME"

start_containers "${containers[@]}"

sleep 3

initialize_replica_set "${containers[@]}"

sleep 15

primary_container_name=$(get_primary_container_name)

echo "🔍 Primary container name: $primary_container_name";

    if [ -z "$primary_container_name" ]; then
        echo "🚨 Could not retrieve primary container name, Please try again"
        exit
    fi

show_connection_string $primary_container_name

