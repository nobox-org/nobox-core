#!/bin/sh
useLocalSharedLib(){
    echo
    echo "🌟 Changing directory to ./shared-lib... 📚"
    cd ../shared-lib || { echo "🚨 Error: Could not change directory to ./shared-lib" ; exit 1; }
    echo
    echo "🔨 Building shared-lib..."
    npm run build 2>&1
    echo
    echo "🚀 Changing directory to ./nobox-core..."
    cd ../nobox-core || { echo "🚨 Error: Could not change directory to ./nobox-core" ; exit 1; }
    echo
    echo "📦 Installing shared-lib..."
    npm i /Users/akin/nobox-main/shared-lib --save 2>&1 && echo "🎉 Successfully installed shared-lib" 
    echo
    echo "👏 Done! 👏"
}

useLocalSharedLib

