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
import { redisConnection } from './utils/redis/connection';

async function bootstrap() {

  const env = getGlobalVar("env")
  const { port, serverName, docsPath, ipWhitelist } = config().serverConfig;

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

  redisConnection(Logger).init();

  await app.listen(port, () => {
    Logger.log(`Server Starts at ${port}`, 'serverInit');
    Logger.log(`serverUrl: ${fullURL}`, 'serverLinks');
    Logger.log(`serverDocs: ${fullURL}/docs`, 'serverLinks');
    Logger.log(`serverGraphql: ${fullURL}/graphql`, 'serverLinks');
  }
  );
}
bootstrap();
