# Nobox server

- To installation: `npm install`
- To setup docker: `npm run setup`
- To run nobox: `npm run start:debug`


# Export Graphiql Playground JSON
- Install [this chrome extension](https://chrome.google.com/webstore/detail/localstorage-manager/fkhoimdhngkiicbjobkinobjkoefhkap/related
)
- Navigate to [playground](http://localhost:8000/_internal_/graphql)
- Click the Installed Extension
- And import the contents of `_/graphiql.json`
- Reload [playground](http://localhost:8000/_internal_/graphql)


# Notes
- You have to enableDeveloperMode for each recordSpace to get list of endpoints;