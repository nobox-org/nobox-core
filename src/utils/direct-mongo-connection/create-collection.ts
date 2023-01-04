import { FindOptions, Filter, OptionalId, UpdateOptions, UpdateFilter, FindOneAndUpdateOptions } from 'mongodb';
import { CustomLogger as Logger } from "@/logger/logger.service";
import { redisConnection } from "../redis-connection";
import { createCollectionInstance } from './create-collection-instance';

export const allowedCollection = [
    "record-dump",
    "projects"
];

export const collection = <T>(
    collectionName: typeof allowedCollection[number],
    logger: Logger,
) => {
    const collectionInstance = createCollectionInstance(collectionName, logger);
    const hashKey = collectionName;
    const redisClient = redisConnection(logger).client;


    const invalidateCache = (options?: { via: "updateOne" | "deleteOne" }) => {
        logger.sLog(options, `directMongodbConnection::${collectionName}::invalidateCache invalidating cache`);
        redisClient.del(hashKey);
    }

    const retrieveCache = async (primaryKey: string) => {
        logger.sLog({ primaryKey }, `directMongodbConnection::${collectionName}::retrieveCache retrieving cache`);
        const cacheValue = await redisClient.hGet(hashKey, primaryKey);
        if (cacheValue) {
            logger.sLog({ cacheValue }, `directMongodbConnection::${collectionName}::found Response from redis`);
            return JSON.parse(cacheValue);
        }
        logger.sLog({ hashKey, primaryKey }, `directMongodbConnection::${collectionName}:: cache does not exist for primaryKey`);
        return null;
    }

    const updateCache = async (primaryKey: string, value: string) => {
        logger.sLog({ hashKey, primaryKey, value }, `directMongodbConnection::${collectionName}::updateCache updating cache`);
        await redisClient.hSet(hashKey, primaryKey, value);
        redisClient.expire(hashKey, 60 * 10000);
    }

    const updateOne = async <T>(
        filter: Filter<T>,
        update: UpdateFilter<T>,
        options?: UpdateOptions
    ) => {
        logger.sLog({ filter, update }, `directMongodbConnection::${collectionName}::updateOne updating`);
        invalidateCache({ via: "updateOne" });
        const status = await collectionInstance.updateOne(filter, update, options);
        logger.sLog({ status }, `directMongodbConnection::${collectionName}::updateOrCreateOne status`);
    }


    const findOneAndUpdateOne = async <T>(
        filter: Filter<T>,
        update: UpdateFilter<T>,
        options: FindOneAndUpdateOptions,
    ) => {
        logger.sLog({ filter, update }, `directMongodbConnection::${collectionName}::findOneAndUpdate updating`);
        invalidateCache({ via: "updateOne" });
        const status = await collectionInstance.findOneAndUpdate(filter, update, options);
        logger.sLog({ status }, `directMongodbConnection::${collectionName}::findOneAndUpdate status`);
    }


    const deleteOne = <T>(filter: Filter<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::deleteOne deleting ${collectionName}`);
        invalidateCache();
        return collectionInstance.deleteOne(filter);
    }


    const find = async <T>(filter: Filter<T>, findOptions?: FindOptions<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::find finding ${collectionName}`);

        const redisPrimaryKey = JSON.stringify({ filter, findOptions });
        const cacheValue = await retrieveCache(redisPrimaryKey);
        if (cacheValue) {
            return cacheValue;
        }
        const result = await collectionInstance.find(filter, findOptions).toArray();
        await updateCache(redisPrimaryKey, JSON.stringify(result));
        return result;
    }

    const findOne = async <T>(filter: Filter<T>, findOptions?: FindOptions<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::findOne finding ${collectionName}`);

        const redisPrimaryKey = "findOne" + JSON.stringify({ filter, findOptions });
        const cacheValue = await retrieveCache(redisPrimaryKey);
        if (cacheValue) {
            return cacheValue;
        }
        const result = await collectionInstance.findOne(filter, findOptions);
        await updateCache(redisPrimaryKey, JSON.stringify(result));
        return result;
    }


    const insert = async <T>(doc: OptionalId<T>) => {
        logger.sLog({ doc }, `directMongodbConnection::${collectionName}::insert ${collectionName}`);
        invalidateCache();
        const { insertedId } = await collectionInstance.insertOne(doc);
        return {
            _id: String(insertedId),
            ...doc
        }
    }


    return {
        updateOne,
        deleteOne,
        find,
        insert,
        findOneAndUpdateOne,
        findOne
    }
}

