#!/bin/bash

. ./scripts/shared-functions.sh

. ./scripts/setup-influxdb/args.sh

. ./scripts/setup-influxdb/functions.sh

assert_docker_existence

assert_docker_running_status

install_influxdb "$CONTAINER_NAME" "$PORT"

get_influxdb_connection_string "$CONTAINER_NAME" "$PORT"
