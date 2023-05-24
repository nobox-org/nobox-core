import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cors from 'cors';
import { join } from 'path';
import { AppModule } from './app.module';
import { CustomLogger, CustomLoggerInstance as Logger } from './logger/logger.service';
import config from './config';
import { fullURL } from './config/serverConfig';
import { getGlobalVar } from './utils/globalVar';
import { ValidationPipe } from '@nestjs/common';
import { corsOptionsDelegate } from './utils';
import { mongoDbConnection } from './utils/mongo';
import { PORT, SENTRY_DSN } from './config/mainConfig';
import { assertCompulsoryEnvProvision, logCodeStateInfo, serverInit } from './utils/gen';
import * as Sentry from '@sentry/node';
import { NodeEnvironment } from './types';

async function bootstrap(port: number) {

  logCodeStateInfo();

  const env = getGlobalVar("env") as NodeEnvironment;
  assertCompulsoryEnvProvision(["SENTRY_DSN"]);

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: env === NodeEnvironment.Dev ? 1.0 : 1.0,
  });

  assertCompulsoryEnvProvision();

  const { serverName, docsPath, ipWhitelist } = config().serverConfig;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new CustomLogger() });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.useLogger(new CustomLogger());

  app.use(cors(corsOptionsDelegate(ipWhitelist, Logger)));

  const options = new DocumentBuilder()
    .setTitle(`[${env} environment] Nobox API [${serverName}] `)
    .setDescription(` Nobox  API Documentation [${env}]`)
    .setVersion('1.01')
    .addBearerAuth({ in: 'header', type: 'http' })
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup(docsPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true
    },
    customSiteTitle: `[${env}] Documentation`,
  });

  const hello = join(__dirname, '../dist/logger');
  app.useStaticAssets(hello);

  mongoDbConnection(Logger).init()

  //  redisConnection(Logger).init();

  await app.listen(port, () => serverInit(port, fullURL));
}

bootstrap(PORT);


