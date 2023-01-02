import { MONGO_DB_NAME } from "@/config/mainConfig";
import { connString } from "@/config/dbConfig";

import { CustomLogger as Logger } from "@/logger/logger.service";
import { MongoClient } from 'mongodb';
import { throwBadRequest } from "./exceptions";

const client = new MongoClient(connString);

client.connect();

export const initDirectMongoDbConnection = (logger: Logger) => {
    client.on("connectionCreated", () => {
        logger.sLog({ connString }, "initDirectMongoDbConnection:: MongoDb connection created");
    })
};

const allowedCollection = {
    "record-dump": true,
};

export const collection = (collectionName: keyof typeof allowedCollection, logger: Logger) => {
    if (allowedCollection[collectionName]) {
        return client.db(MONGO_DB_NAME, {
            logger: (...args) => {
                logger.sLog(args);
            }
        }).collection(collectionName);
    }

    logger.sLog({ collectionName }, "collection:: Collection not allowed");
    throwBadRequest("Something went wrong");
}


export const recordDump = (
    logger: Logger
) => {

    const recordDumpCollection = collection("record-dump", logger);

    const updateOne = (
        filter: Record<string, any>,
        update: Record<string, any>,
        idData: { recordSpaceSlug: string; projectSlug: string; userId: string; }
    ) => {
        logger.sLog({ filter, update }, "directMongodbConnection::recordDump::updateOne updating record dump");

        return recordDumpCollection.updateOne(filter, {
            $set: {
                idData,
                ...update
            }
        }, {
            upsert: true
        });

    }

    const deleteOne = (filter: Record<string, any>) => {
        logger.sLog({ filter }, "directMongodbConnection::recordDump::deleteOne deleting record dump");
        return recordDumpCollection.deleteOne(filter);
    }
    return {
        updateOne,
        deleteOne
    }
}

