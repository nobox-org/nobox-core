import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import { mongoDbConnection } from './mongo-connection';

export const createCollectionInstance = <T>(
   collectionName: string,
   logger: Logger,
) => {
   const client = mongoDbConnection(logger).client;
   return client.db().collection<T>(collectionName);
};
