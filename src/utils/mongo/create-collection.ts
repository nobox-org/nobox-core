import {
   FindOptions,
   Filter,
   WithId,
   UpdateOptions,
   UpdateFilter,
   FindOneAndUpdateOptions,
   OptionalUnlessRequiredId,
   IndexSpecification,
   IndexDescription,
   CreateIndexesOptions,
} from 'mongodb';
import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { redisConnection, redisUtils } from '../redis';
import { createCollectionInstance } from './create-collection-instance';

export const allowedCollection = ['projects', 'records'];

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

   const collectionInstance = createCollectionInstance<T>(
      collectionName,
      _logger,
   );
   if (indexes) {
      collectionInstance.createIndexes(indexes);
   }
   const hashKey = collectionName;
   const redisClient = ({} as any) || (redisConnection(_logger).client as any);

   const logger = log
      ? _logger
      : {
           sLog: () => {
              //do nothing
           },
        };

   const { retrieveCache, invalidateCache, updateCache } = redisUtils({
      logger: logger as any,
      redisClient,
      hashKey,
      collectionName,
      cache: false,
   });

   const updateOne = async (
      filter: Filter<T>,
      update: UpdateFilter<T>,
      options?: UpdateOptions,
   ) => {
      logger.sLog(
         { filter, update },
         `directMongodbConnection::${collectionName}::updateOne updating`,
      );
      const status = await collectionInstance.updateOne(
         filter,
         update,
         options,
      );
      invalidateCache({ via: 'updateOne' });
      logger.sLog(
         { status },
         `directMongodbConnection::${collectionName}::updateOrCreateOne status`,
      );
   };

   const findOneAndUpdate = async (
      filter: Filter<T>,
      update: UpdateFilter<T>,
      options?: FindOneAndUpdateOptions,
   ) => {
      logger.sLog(
         { filter, update },
         `directMongodbConnection::${collectionName}::findOneAndUpdate updating`,
      );
      const presentDate = new Date();
      if (update.$set) {
         update = {
            ...update,
            $set: {
               ...update.$set,
               updatedAt: presentDate,
            },
         };
      } else {
         update['updatedAt'] = presentDate;
      }

      const res = await collectionInstance.findOneAndUpdate(
         filter,
         update,
         options,
      );
      invalidateCache({ via: 'findOneAndUpdate' });
      return res.value;
   };

   const findOneAndDelete = async (filter: Filter<T>) => {
      logger.sLog(
         { filter },
         `directMongodbConnection::${collectionName}::findOneAndDelete deleting`,
      );
      const res = await collectionInstance.findOneAndDelete(filter);
      invalidateCache({ via: 'findOneAndDelete' });
      return res.value;
   };

   const deleteOne = (filter: Filter<T>) => {
      logger.sLog(
         { filter },
         `directMongodbConnection::${collectionName}::deleteOne:: ${collectionName}`,
      );
      const del = collectionInstance.deleteOne(filter);
      invalidateCache({ via: 'deleteOne' });
      return del;
   };

   const deleteAll = (filter: Filter<T>) => {
      logger.sLog(
         { filter },
         `directMongodbConnection::${collectionName}::deleteAll:: ${collectionName}`,
      );
      const del = collectionInstance.deleteMany(filter);
      invalidateCache({ via: 'deleteAll' });
      return del;
   };

   const find = async (
      filter: Filter<T> = {},
      findOptions?: FindOptions<T>,
   ): Promise<WithId<T>[]> => {
      logger.sLog(
         { filter },
         `directMongodbConnection::${collectionName}::finding ${collectionName}`,
      );

      const redisPrimaryKey = JSON.stringify({ filter, findOptions });
      const cacheValue = await retrieveCache<WithId<T>[]>(redisPrimaryKey);
      if (cacheValue) {
         return cacheValue;
      }

      const result = await collectionInstance
         .find(filter, findOptions)
         .toArray();

      updateCache(redisPrimaryKey, JSON.stringify(result));
      return result;
   };

   const findOne = async (filter: Filter<T>, findOptions?: FindOptions<T>) => {
      logger.sLog(
         { filter },
         `directMongodbConnection::${collectionName}::findOne finding ${collectionName}`,
      );
      const redisPrimaryKey =
         'findOne' + JSON.stringify({ filter, findOptions });
      const cacheValue = await retrieveCache<WithId<T>>(redisPrimaryKey);
      logger.sLog(
         { cacheValue, redisPrimaryKey, collectionName },
         'findOne::cacheValue',
      );
      if (cacheValue) {
         return cacheValue;
      }
      const result = await collectionInstance.findOne(filter);
      updateCache(redisPrimaryKey, JSON.stringify(result));
      return result;
   };

   const insert = async (
      doc: OptionalUnlessRequiredId<Omit<T, 'createdAt' | 'updatedAt'>>,
   ): Promise<any> => {
      logger.sLog(
         { doc },
         `directMongodbConnection::${collectionName}::insert ${collectionName}`,
      );

      invalidateCache();
      const _doc = { ...doc } as any;
      if (addDates) {
         const presentDate = new Date();
         _doc.createdAt = presentDate;
         _doc.updatedAt = presentDate;
      }

      const { insertedId } = await collectionInstance.insertOne(_doc);

      return {
         _id: String(insertedId),
         ...doc,
      };
   };

   const createIndex = async (
      index: IndexSpecification,
      options?: CreateIndexesOptions,
   ) => {
      logger.sLog(
         { index },
         `directMongodbConnection::${collectionName}::createIndex ${collectionName}`,
      );
      const res = await collectionInstance.createIndex(index, options);
      return res;
   };

   const getIndexes = async () => {
      logger.sLog(
         {},
         `directMongodbConnection::${collectionName}::getIndexes ${collectionName}`,
      );
      const res = await collectionInstance.indexes();
      return res;
   };

   const dropIndexes = async () => {
      logger.sLog(
         {},
         `directMongodbConnection::${collectionName}::dropIndexes ${collectionName}`,
      );
      const res = await collectionInstance.dropIndexes();
      return res;
   };

   const watch = async (pipeline: any[]) => {
      logger.sLog(
         {},
         `directMongodbConnection::${collectionName}::watch ${collectionName}`,
      );
      const res = collectionInstance.watch(pipeline);
      return res;
   };

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
      dropIndexes,
      getIndexes,
      watch,
   };
};
