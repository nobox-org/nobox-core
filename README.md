# Nobox server

## Requirements
- Docker ( >20.10.13 )
- Node ( > 16.13.0 )

## Usage
Run the following Commands
- `npm install`
- `npm run setup:mongo-replica`
- `npm run start:debug`

## To Clear Mongo Data
- `npm run setup -- --rebuild`
# Notes
- Ignore every graphql resources in the code, they are redundant at the moment