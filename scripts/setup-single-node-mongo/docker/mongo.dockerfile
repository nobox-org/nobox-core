FROM mongo:4.0.3

ENV MONGO_INITDB_ROOT_USERNAME admin-user
ENV MONGO_INITDB_ROOT_PASSWORD admin-password
ENV MONGO_INITDB_DATABASE admin

ADD mongo-init.sh /docker-entrypoint-initdb.d/