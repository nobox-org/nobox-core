#!/bin/bash

. ./scripts/shared-functions.sh

. ./scripts/setup-mongo-replica/args.sh

. ./scripts/setup-mongo-replica/functions.sh

load_environment_variables "env/.local.env"

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

import_json_seed_data_to_mongodb $primary_container_name ./seed-data/users.json users nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/projects.json projects nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/project-users.json project-users nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/record-dump.json record-dump nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/records.json records nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/record-fields.json record-fields nobox
import_json_seed_data_to_mongodb $primary_container_name ./seed-data/recordspace.json recordspace nobox


show_connection_string $primary_container_name

