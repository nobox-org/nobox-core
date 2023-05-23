#!/bin/bash

load_environment_variables() {
  local env_file="$1"
  
  echo "🔍 Loading environment variables from $env_file..."
  if [ -f "$env_file" ]; then
    export $(cat "$env_file" | sed 's/#.*//g' | xargs)
  fi
  echo "✅ Loaded environment variables."
}

check_and_remove_existing_container() {
  local container_name="$1"
  
  if docker container inspect "$container_name" > /dev/null; then
    echo "🚨 Container $container_name already exists. Removing existing container: $container_name..."
    docker stop "$container_name" >/dev/null
    docker rm "$container_name" >/dev/null
    echo "✅ Existing container removed."
  fi
}

start_container() {
  local container_name="$1"
  local port="$2"
  
  echo "🐳 Starting MongoDB container $container_name..."
  docker run --name "$container_name" --net "$NETWORK_NAME" -p "$port:27017" -d mongo --replSet $MONGO_REPLICA_SET >/dev/null
  echo "✅ $container_name container started."
}

start_containers() {
  local containers=( "$@" )
  local port=$MONGO_REPLICA_INIT_PORT
  
  for container in "${containers[@]}"; do
    check_and_remove_existing_container "$container"
    start_container "$container" "$port"
    (( port++ ))
  done
}

remove_existing_docker_network() {
  local network_name="$1"

  if docker network inspect "$network_name" >/dev/null 2>&1; then
    local endpoints=( $(docker network inspect "$network_name" --format '{{range $id, $ep := .Containers}}{{$id}} {{end}}') )

    if [ ${#endpoints[@]} -gt 0 ]; then
      echo "🚨 Removing all endpoints from network $network_name..."
      for endpoint in "${endpoints[@]}"; do
        docker network disconnect -f "$network_name" "$endpoint" >/dev/null
      done
      echo "✅ All endpoints removed from network."
    fi

    echo "🌐 Deleting network $network_name..."
    docker network rm "$network_name" >/dev/null
    echo "✅ Network deleted."
  else
    echo "No network found with name $network_name."
  fi
}

create_docker_network() {
  local network_name="$1"

  remove_existing_docker_network "$network_name"
  
  echo "🌐 Creating network $network_name..."
  docker network create "$network_name" >/dev/null
  echo "✅ Network created."
}

initialize_replica_set() {
  local containers=( "$@" )
  local port=$MONGO_REPLICA_INIT_PORT
  local priority=0

  # Create replica set configuration string
  local conf_str='{"_id":"'${MONGO_REPLICA_SET}'", "members":['
  for (( i=0; i<${#containers[@]}; i++ )); do
    (( priority++ ))
    container_ip=$(get_docker_host_ip "${containers[i]}")
    if [ $i -gt 0 ]; then
      conf_str+=','
    fi
    conf_str+='{ "_id": '$i', "host": "'${container_ip}:$port'"'
    conf_str+=', "priority": '$priority'}'
  done
  conf_str+=']}'

  echo "⏳ Initializing replica set..."
  # Connect to primary MongoDB container and configure replica set
  echo "Initializing replica set on ${containers[0]}..."
  docker exec -it "${containers[0]}" mongosh admin --eval "rs.initiate($conf_str)" > /dev/null;
  echo "✅ Replica set initialized."
}

get_primary_container_name() {
    primary_ip=$(docker exec "$CONTAINER_NAME_ONE" mongosh --quiet --eval "printjson(rs.isMaster().primary)")

    container_details=$(docker ps --format "{{.Names}}" --filter "network=$NETWORK_NAME" --filter "status=running" | xargs -I {} docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}} {{.Name}}' {})

    local vip="${primary_ip%%:*}"
    
    container_name=$(grep -Fw "$vip" <<< "$container_details" | awk '{print $2}' | xargs -I {} basename {})

    echo "$container_name"
}

import_json_seed_data_to_mongodb() {
    local primary_container_name=$1
    local json_file=$2
    local collection_name=$3
    local database_name=$4

    echo "🌱 Importing seed data from $json_file to $database_name.$collection_name... via $primary_container_name"

    docker cp "$json_file" "$primary_container_name":/seed.json
    echo "✅ Seed data imported"

    docker exec -it "$primary_container_name" bash -c "mongoimport --db $database_name --collection $collection_name --file /seed.json --jsonArray && mongosh $database_name --eval 'db.$collection_name.find()'" > /dev/null 2>&1
}

get_docker_container_port() {
    local container_name_or_id="$1"
    local port=$(docker port "$container_name_or_id" | awk -F':' '{print $2}')
    echo "$port"
}

show_connection_string() {
  local primary_container_name=$1
  primary_node_port=$(get_docker_container_port "$primary_container_name")
  echo "mongodb://127.0.0.1:$(expr "$INIT_MONGO_PORT" + 2)/?directConnection=true&replicaSet=${MONGO_REPLICA_SET}"
}


