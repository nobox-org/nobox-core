import { FindOptions, Filter, WithId, OptionalId, UpdateOptions, UpdateFilter, FindOneAndUpdateOptions, OptionalUnlessRequiredId, IndexSpecification, IndexDescription, ObjectId, CreateIndexesOptions } from 'mongodb';
import { CustomLogger as Logger } from "@/logger/logger.service";
import { redisConnection, redisUtils } from "../redis";
import { createCollectionInstance } from './create-collection-instance';

export const allowedCollection = [
    "projects",
    "records",
];

const log = true;

export const collection = <T>(
    collectionName: typeof allowedCollection[number],
    _logger?: Logger,
    option?: {
        addDates?: boolean;
        indexes?: IndexDescription[];
    },
) => {

    const { addDates = true, indexes = null } = option || {};

    const collectionInstance = createCollectionInstance<T>(collectionName, _logger);
    if (indexes) {
        collectionInstance.createIndexes(indexes);
    }
    const hashKey = collectionName;
    const redisClient = {} as any || redisConnection(_logger).client as any;

    const logger = log ? _logger : {
        sLog: () => { },
    };

    const { retrieveCache, invalidateCache, updateCache } = redisUtils({ logger: logger as any, redisClient, hashKey, collectionName, cache: false });


    const updateOne = async (
        filter: Filter<T>,
        update: UpdateFilter<T>,
        options?: UpdateOptions
    ) => {
        logger.sLog({ filter, update }, `directMongodbConnection::${collectionName}::updateOne updating`);
        console.time("updateOne");
        const status = await collectionInstance.updateOne(filter, update, options);
        console.timeEnd("UpdateOne");
        invalidateCache({ via: "updateOne" });
        logger.sLog({ status }, `directMongodbConnection::${collectionName}::updateOrCreateOne status`);
    }

    const findOneAndUpdate = async (
        filter: Filter<T>,
        update: UpdateFilter<T>,
        options?: FindOneAndUpdateOptions
    ) => {
        logger.sLog({ filter, update }, `directMongodbConnection::${collectionName}::findOneAndUpdate updating`);
        console.time("findOneAndUpdate");
        const presentDate = new Date;
        if (update.$set) {
            //@ts-ignore
            update.$set["updatedAt"] = presentDate;
        } else {
            update["updatedAt"] = presentDate;
        }

        const res = await collectionInstance.findOneAndUpdate(filter, update, options);
        console.timeEnd("findOneAndUpdate");
        invalidateCache({ via: "findOneAndUpdate" });
        return res.value;
    }

    const findOneAndDelete = async (
        filter: Filter<T>,
    ) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::findOneAndDelete deleting`);
        const res = await collectionInstance.findOneAndDelete(filter);
        invalidateCache({ via: "findOneAndDelete" });
        return res.value;
    }


    const deleteOne = (filter: Filter<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::deleteOne:: ${collectionName}`);
        const del = collectionInstance.deleteOne(filter);
        invalidateCache({ via: "deleteOne" });
        return del;
    }


    const deleteAll = (filter: Filter<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::deleteAll:: ${collectionName}`);
        const del = collectionInstance.deleteMany(filter);
        invalidateCache({ via: "deleteAll" });
        return del;
    }

    const find = async (filter: Filter<T> = {}, findOptions?: FindOptions<T>): Promise<WithId<T>[]> => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::finding ${collectionName}`);
        const rand = Math.random();

        console.time("findCache" + rand);
        const redisPrimaryKey = JSON.stringify({ filter, findOptions });
        const cacheValue = await retrieveCache<WithId<T>[]>(redisPrimaryKey);
        console.timeEnd("findCache" + rand);
        if (cacheValue) {
            return cacheValue;
        }

        console.time("find" + rand);
        const result = await collectionInstance.find(filter, findOptions).toArray();
        console.timeEnd("find" + rand);

        updateCache(redisPrimaryKey, JSON.stringify(result));
        return result;
    }

    const findOne = async (filter: Filter<T>, findOptions?: FindOptions<T>) => {
        logger.sLog({ filter }, `directMongodbConnection::${collectionName}::findOne finding ${collectionName}`);
        const rand = Math.random();

        console.time("findOneCache" + rand);
        const redisPrimaryKey = "findOne" + JSON.stringify({ filter, findOptions });
        const cacheValue = await retrieveCache<WithId<T>>(redisPrimaryKey);
        logger.sLog({ cacheValue, redisPrimaryKey, collectionName }, "findOne::cacheValue")
        console.timeEnd("findOneCache" + rand);
        if (cacheValue) {
            return cacheValue;
        }

        console.time("findOne" + rand);
        console.log({ filter })
        const result = await collectionInstance.findOne(filter);
        console.timeEnd("findOne" + rand);
        updateCache(redisPrimaryKey, JSON.stringify(result));
        return result;
    }


    const insert = async (doc: OptionalUnlessRequiredId<Omit<T, "createdAt" | "updatedAt">>): Promise<any> => {
        logger.sLog({ doc }, `directMongodbConnection::${collectionName}::insert ${collectionName}`);

        invalidateCache();
        const _doc = { ...doc } as any;
        if (addDates) {
            const presentDate = new Date();
            _doc.createdAt = presentDate;
            _doc.updatedAt = presentDate;
        }

        console.time("insert");
        const { insertedId } = await collectionInstance.insertOne(_doc);
        console.timeEnd("insert");

        return {
            _id: String(insertedId),
            ...doc
        }
    }

    const createIndex = async (index: IndexSpecification, options?: CreateIndexesOptions) => {
        logger.sLog({ index }, `directMongodbConnection::${collectionName}::createIndex ${collectionName}`);
        console.time("createIndex");
        const res = await collectionInstance.createIndex(index, options);
        console.timeEnd("createIndex");
        return res;
    }

    const dropIndexes = async () => {
        logger.sLog({}, `directMongodbConnection::${collectionName}::dropIndexes ${collectionName}`);
        console.time("dropIndexes");
        const res = await collectionInstance.dropIndexes();
        console.timeEnd("dropIndexes");
        return res;
    }

    return {
        updateOne,
        deleteOne,
        deleteAll,
        find,
        insert,
        findOneAndUpdate,
        findOne,
        findOneAndDelete,
        createIndex,
        dropIndexes
    }
}

