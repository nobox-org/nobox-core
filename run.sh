#!/bin/sh
runServerPort(){
    SERVER_PORT=8001 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8001
    SERVER_PORT=8002 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8002
    SERVER_PORT=8003 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8003
    SERVER_PORT=8004 pm2 start 'NODE_ENV=dev npm run deploy' --name nobox-core-8004
}

runServerPort

