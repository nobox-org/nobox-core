#!/bin/sh
runServerPort(){
    echo "Installing Packages"
    npm install

    echo "Installing Platform Specific Package"
    npm i @node-rs/argon2-linux-x64-gnu

    echo "Replace nobox-core-8001"
    pm2 delete nobox-core-8001
    SERVER_PORT=8001 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8001

    echo "Replace nobox-core-8002"
    pm2 delete nobox-core-8002
    SERVER_PORT=8002 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8002

    echo "Replace nobox-core-8003"
    pm2 delete nobox-core-8003
    SERVER_PORT=8003 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8003

    echo "Replace nobox-core-8004"
    pm2 delete nobox-core-8004
    SERVER_PORT=8004 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8004
}

runServerPort

