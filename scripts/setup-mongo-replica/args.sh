#!/bin/bash

NETWORK_NAME="${NETWORK_NAME:-nobox-mongo-replica-network}"
CONTAINER_NAME_ONE="${CONTAINER_NAME_ONE:-nobox-mongo-one}"
CONTAINER_NAME_TWO="${CONTAINER_NAME_TWO:-nobox-mongo-two}"
CONTAINER_NAME_THREE="${CONTAINER_NAME_THREE:-nobox-mongo-three}"
REPLICA_SET_NAME="${REPLICA_SET_NAME:-nobox-replica-set}"
INIT_MONGO_PORT="${INIT_MONGO_PORT:-27017}"
DOCKER_VOLUME_NAME="${DOCKER_VOLUME_NAME:-mongo_data}"

containers=( $CONTAINER_NAME_ONE $CONTAINER_NAME_TWO $CONTAINER_NAME_THREE )