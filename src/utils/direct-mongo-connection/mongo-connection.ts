import { CustomLogger as Logger } from '@/logger/logger.service';
import { connString } from "@/config/dbConfig";
import { MongoClient } from 'mongodb';

let cachedConnection: MongoClient;
let acquiringConnection = false;

export const mongoDbConnection = (logger: Logger) => {

    const connectToMongoServer = (args?: { init: boolean, restart?: boolean }) => {
        const { init = false, restart = false } = args || {};
        // logger.sLog({ init }, "mongoDbConnection:: connection To MongoServer requested");

        if (acquiringConnection && init) {
            logger.sLog({ init }, "mongoDbConnection:: connection already in progress, initialization not needed");
            return;
        }

        acquiringConnection = true;

        if (!restart && cachedConnection) {
            //  logger.sLog({ init }, "mongoDbConnection:: found existing connection");

            return cachedConnection;
        };

        logger.sLog({}, "mongoDbConnection::Acquiring new DB connection....");

        try {
            const client = new MongoClient(connString);
            client.connect();
            client.on("open", () => {
                logger.sLog({}, "mongoDbConnection:: MongoDb connection created");
            });
            cachedConnection = client;
            return cachedConnection;
        } catch (error) {
            logger.sLog({ error }, "mongoDbConnection:: MongoDb connection error");
            throw error;
        }
    };

    return {
        init() {
            connectToMongoServer({ init: true });
        },
        client: connectToMongoServer()
    }
}
