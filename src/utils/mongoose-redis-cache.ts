import { CustomLogger as Logger } from "@/logger/logger.service";
import * as mongoose from "mongoose";
import * as redis from "redis";
const client = redis.createClient({
    url: "redis://127.0.0.1:6379"
});

client.on('error', (err) => {
    console.log({ err })
    console.log('Error occurred while connecting or accessing redis server');
});

client.on('ready', () => {
    console.log('Redis server connected');
});

client.connect();



export const initMongooseRedisCache = (logger: Logger) => {
    logger.sLog({}, "initMongooseRedisCache::Redis Cache Initiated");
    const exec = mongoose.Query.prototype.exec;

    (mongoose.Query.prototype as any).cache = function (options: { time: number; key?: string; logger?: any }) {
        this.useCache = true;
        this.logger = options?.logger || logger;
        this.time = options?.time || 120;
        this.hashKey = JSON.stringify(options?.key || this.mongooseCollection.name);
        return this;
    };

    mongoose.Query.prototype.exec = async function () {
        if (!this.useCache) {
            return await exec.apply(this, arguments);
        }


        console.log({ a: this.getQuery() })

        const key = JSON.stringify({
            ...this.getQuery()
        });

        console.time("redis")
        const cacheValue = await client.hGet(this.hashKey, key);
        console.timeEnd("redis");

        if (cacheValue) {
            const doc = JSON.parse(cacheValue);
            this.logger.sLog({ doc, cacheValue, key, query: this.getQuery() }, "initMongooseRedisCache::exec Response from redis");
            return Array.isArray(doc)
                ? doc.map(d => new this.model(d))
                : new this.model(doc);
        }

        const result = await exec.apply(this, arguments);
        client.hSet(this.hashKey, key, JSON.stringify(result));
        client.expire(this.hashKey, this.time);
        this.logger.sLog({}, "initMongooseRedisCache::exec Response from MongoDB");
        return result;
    };

}


export const clearKey = (hashKey: any) => {
    client.del(JSON.stringify(hashKey));
}