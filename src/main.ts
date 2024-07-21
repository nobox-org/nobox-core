import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cors from 'cors';
import {
   CustomLogger,
   CustomLoggerInstance as Logger,
} from './modules/logger/logger.service';
import config from './config';
import { fullURL } from './config/resources/server';
import { getGlobalVar } from './utils/globalVar';
import { ValidationPipe } from '@nestjs/common';
import { corsOptionsDelegate } from './utils';
import { PORT, SENTRY_DSN } from './config/resources/process-map';
import {
   assertCompulsoryEnvProvision,
   logCodeStateInfo,
   serverInit,
} from './utils/gen';
import * as Sentry from '@sentry/node';
import { NodeEnvironment } from './types';
import { AppModule } from './modules/app/app.module';
import { mongoDbConnection } from 'nobox-shared-lib';
import { connOptions, connString } from './config/resources/db-conn';

async function bootstrap(port: number) {
   logCodeStateInfo();

   const env = getGlobalVar('env') as NodeEnvironment;

   assertCompulsoryEnvProvision();

   if (SENTRY_DSN) {
      Sentry.init({
         dsn: SENTRY_DSN,
         tracesSampleRate: env === NodeEnvironment.Dev ? 1.0 : 1.0,
      });
   }

   const { serverName, docsPath, ipWhitelist } = config().serverConfig;

   const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      logger: new CustomLogger(),
   });

   app.useGlobalPipes(new ValidationPipe({ transform: true }));

   app.useLogger(new CustomLogger());

   app.use(cors(corsOptionsDelegate(ipWhitelist, Logger)));

   // app.use((_req, res, next) => {
   //    Logger.sLog({ req: _req.url }, '404::not found');
   //    res.status(404).json({ error: { message: 'Endpoint not found' } });
   // });

   const options = new DocumentBuilder()
      .setTitle(`[${env} environment] Nobox Core [${serverName}] `)
      .setDescription(`Nobox-Core Documentation [${env}]`)
      .setVersion('1.01')
      .addBearerAuth({ in: 'header', type: 'http' })
      .build();

   const document = SwaggerModule.createDocument(app, options);

   SwaggerModule.setup(docsPath, app, document, {
      swaggerOptions: {
         persistAuthorization: true,
      },
      customSiteTitle: `[${env}] Documentation`,
   });

   mongoDbConnection({
      connOptions,
      connString,
      logger: Logger,
      logAll: true,
   }).init();

   Logger.sLog({ port }, `port: ${port}`);

   await app.listen(port, () => serverInit(port, fullURL));
}

bootstrap(PORT);
