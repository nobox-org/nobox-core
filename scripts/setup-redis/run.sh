#!/bin/bash
. ./scripts/shared-functions.sh
. ./scripts/setup-redis/args.sh
. ./scripts/setup-redis/functions.sh

assert_docker_existence
assert_docker_running_status

cleanup_redis_container "$REDIS_SERVER_IMAGE_NAME" "$REDIS_SERVER_CONTAINER_NAME"

install_redis "$REDIS_SERVER_IMAGE_NAME" "$REDIS_SERVER_CONTAINER_NAME" "$REDIS_SERVER_PORT"



