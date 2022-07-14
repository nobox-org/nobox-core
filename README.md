# THETHIRD-API

- Run with `npm run start:debug`


- Run Minio
```docker
docker run -p 9000:9000 -p 9001:9001 --env-file ./env/.local.env quay.io/minio/minio server /data --console-address ":9001"
```


- Run Mongo
```
cd docker && docker build -f docker/mongo.dockerfile -t n_mongo . && cd .. & docker run --name n_mongo -d -p 27017:27017 --env-file ./env/.local.env n_mongo
```