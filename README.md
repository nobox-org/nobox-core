# Installation

### Local Installation
-  Clone `git clone https://github.com/nobox-org/nobox-core.git`
-  Rename env file: `mv env/.example.env env/.local.env`
-  Start local Mongo Replica using docker: `npm run setup:mongo-replica`
-  Install Nobox:
    - On Mac/Windows: `npm install`
    - On Linux: `npm run install:nobox-on-linux`
-  Run: `npm run dev`

### Connect Your Client to the Local Installation
- Run Nobox-console: `https://github.com/nobox-org/nobox-console`
- Connect Your Client following docs here: `https://www.docs.nobox.cloud/integrate-nobox`

### Test Nobox Using Online Playground
- follow the docs here: `https://docs.nobox.cloud`
