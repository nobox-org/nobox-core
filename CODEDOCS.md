# Modules

## Open Modules
These modules contain endpoints that are open to the world to use. For now,this basically includes the SDK and dashboard and external source that knows how to use the endpoints
- **App**: This encapsulates other modules. More like the entry point for all modules. It has a few base endpoints in the controller that serves no core functions 
- **Auth**: This serves only the dashboard (https://dashboard.nobox.cloud) for now
- **Gateway**: This serves only the dashboard too
- **Client**: This contains the endpoints that our Javascript SDK (https://www.npmjs.com/package/nobox-client) is built on
- **Client-utils**: This has some extra endpoints for structure manipulation. These endpoints are open to use but not yet consumed by our sdk

## Helper Modules
These modules serve other modules
- **Client-functions**: This serves the client module with special functions needed in the client for SDKs and external API usage
- **logger**: This contains the logger function that serves the whole app

## Core Modules
This modules perform core nobox operations and serves the open endpoints on Client, Auth and Gateway modules
They includes:
- **projects**: handles projects
- **record-spaces**: handles record-spaces
- **records**: handles storing records 
- **track-logs**: handles logging requests made by client in the database

## Auth
There are two ways to authenticate access into nobox
- API token generated from the *Auth* module, this is usually gotten from the dashboard
  - Gives access to *Client* module endpoints
- Bearer token generated from the *Auth* module, this is usaully gotten when logging in into the dashboard
  - Gives access to *Gateway* and *Client utils* endpoints.

Note: *Client utils* endpoint should most likely be upgraded to use API token instead of bearer token



## Video Guide: https://fathom.video/calls/114698385

