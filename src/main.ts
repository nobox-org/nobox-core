import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';
import * as cors from 'cors';
import { join } from 'path';
import { AppModule } from './app.module';
import { CustomLogger, CustomLoggerInstance as Logger } from './logger/logger.service';
import config from './config';
import { fullURL } from './config/serverConfig';
import { getGlobalVar } from './utils/globalVar';

async function bootstrap() {

  const env = getGlobalVar("env")
  const { port, serverName, docsPath, ipWhitelist } = config().serverConfig;

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new CustomLogger() });
  app.useLogger(new CustomLogger());

  const corsOptionsDelegate = {
    origin: (requestOrigin: string, callback: any) => {
      const nonServerRequest =
        requestOrigin === undefined ? 'Non-Server Request' : requestOrigin;
      const whiteListed = ipWhitelist.indexOf(requestOrigin) !== -1;
      const allowed = whiteListed || nonServerRequest === 'Non-Server Request';
      allowed
        ? Logger.log(`CORS: Allowed ${nonServerRequest}`)
        : Logger.debug(
          `CORS: blocked ${nonServerRequest}`,
          `ALLOWED LINKS: ${ipWhitelist} `,
        );
      return callback(null, allowed);
    },
    allowedHeaders:
      'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Observe, Authorization',
    methods: 'GET,PUT,POST,DELETE,UPDATE,OPTIONS',
    credentials: true,
  };

  app.use(cors(corsOptionsDelegate));

  const options = new DocumentBuilder()
    .setTitle(`[${env} environment] Nobox API [${serverName}] `)
    .setDescription(` Nobox  API Documentation [${env}]`)
    .setVersion('1.01')
    .addBearerAuth({ in: 'header', type: 'http' })
    .build();

  const document = SwaggerModule.createDocument(app, options);

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true
    },
    customSiteTitle: `[${env}] Documentation`,
  };

  SwaggerModule.setup(docsPath, app, document, customOptions);

  const hello = join(__dirname, '../dist/logger');
  app.useStaticAssets(hello);

  await app.listen(port, () => {
    Logger.log(`Server Starts at ${port}`, 'serverInit');
    Logger.log(`serverUrl: ${fullURL}`, 'serverLinks');
    Logger.log(`serverDocs: ${fullURL}/docs`, 'serverLinks');
    Logger.log(`serverGraphql: ${fullURL}/_internal_/graphql`, 'serverLinks');
  }
  );
}
bootstrap();
