#!/bin/bash
run_linux_node(){
    echo "Installing Packages"
    npm install

    echo "Installing Platform Specific Package"
    npm i @node-rs/argon2-linux-x64-gnu

    NODE_ENV=local npm run deploy
}