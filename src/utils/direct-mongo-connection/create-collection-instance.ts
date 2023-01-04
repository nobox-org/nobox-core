import { CustomLogger as Logger } from '@/logger/logger.service';
import { mongoDbConnection } from './mongo-connection';

export const createCollectionInstance = (collectionName: string, logger: Logger) => {
    const client = mongoDbConnection(logger).client;
    return client.db().collection(collectionName);
};