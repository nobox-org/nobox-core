#!/bin/bash

install_influxdb() {
    local influxdb_container_name="$1"
    local influxdb_port="$2"

    docker run -d -p "$influxdb_port":8086 --name "$influxdb_container_name" influxdb

    echo "✅ InfluxDB installed successfully!"
    echo "🔌 Port: $influxdb_port"
}

get_influxdb_connection_string() {
    local influxdb_container_name="$1"
    local influxdb_port="$2"

    local docker_host_ip=$(get_docker_host_ip "$influxdb_container_name")

    local connection_string="http://$docker_host_ip:$influxdb_port"

    echo "🔗 InfluxDB Connection String: $connection_string"
}

