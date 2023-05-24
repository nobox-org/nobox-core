import { CustomLogger as Logger } from "@/logger/logger.service";
import { RedisClientType } from "@redis/client";


export const redisUtils = (args: {
    logger: Logger;
    redisClient: RedisClientType<any>;
    hashKey: string;
    collectionName: string;
    cache?: boolean
}) => {
    const { logger, redisClient, hashKey, collectionName, cache = true } = args;

    const invalidateCache = async (options?: { via: "updateOne" | "deleteOne" | "findOneAndUpdate" | "findOneAndDelete" | "deleteAll" }) => {
        logger.sLog(options, `redisUtils::${collectionName}::invalidateCache invalidating cache`);
        await redisClient.del(hashKey);
    }

    const retrieveCache = async <R>(primaryKey: string): Promise<R> => {
        logger.sLog({ primaryKey }, `redisUtils::${collectionName}::retrieveCache retrieving cache`);
        const cacheValue = await redisClient.hGet(hashKey, primaryKey);
        if (cacheValue) {
            logger.sLog({ cacheValue }, `redisUtils::${collectionName}::found Response from redis`);
            return JSON.parse(cacheValue);
        }
        logger.sLog({ hashKey, primaryKey }, `redisUtils::${collectionName}:: cache does not exist for primaryKey`);
        return null;
    }

    const updateCache = async (primaryKey: string, value: string) => {
        logger.sLog({ hashKey, primaryKey, value }, `redisUtils::${collectionName}::updateCache updating cache`);
        await redisClient.hSet(hashKey, primaryKey, value);
        await redisClient.expire(hashKey, 60 * 10000);
    }

    return cache ? {
        invalidateCache,
        retrieveCache,
        updateCache,
    } : {
        invalidateCache: () => {
            //do nothing
        },
        retrieveCache: () => {
            //do nothing
        },
        updateCache: () => {
            //do nothing
        },
    }
}
