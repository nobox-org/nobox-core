import { CustomLogger as Logger } from '@/modules/logger/logger.service';
import * as redis from 'redis';

const { createClient } = redis;

let cachedConnection: any;
let acquiringConnection = false;

export const redisConnection = (logger: Logger) => {
   const connectToRedisServer = (args?: {
      init: boolean;
      restart?: boolean;
   }) => {
      const { init = false, restart = false } = args || {};
      logger.sLog(
         { init },
         'redisConnection:: connection To RedisServer requested',
      );

      if (acquiringConnection && init) {
         logger.sLog(
            { init },
            'redisConnection:: connection already in progress, initialization not needed',
         );
         return;
      }

      acquiringConnection = true;

      if (!restart && cachedConnection) {
         logger.sLog({ init }, 'redisConnection:: found existing connection');

         return cachedConnection;
      }

      logger.sLog({}, 'redisConnection::Acquiring new DB connection....');

      try {
         const client = createClient({
            url: 'redis://127.0.0.1:6379',
         });

         client.on('error', err => {
            logger.sLog({ err });
            logger.sLog(
               {},
               'Error occurred while connecting or accessing redis server',
            );
         });

         client.on('ready', () => {
            logger.sLog({}, 'Redis server connected');
         });

         client.connect();

         cachedConnection = client;
         return cachedConnection;
      } catch (error) {
         logger.sLog({ error }, 'redisConnection:: redis connection error');
         throw error;
      }
   };

   return {
      init() {
         connectToRedisServer({ init: true });
      },
      client: connectToRedisServer(),
   };
};
