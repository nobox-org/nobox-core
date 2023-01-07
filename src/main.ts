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

async function bootstrap(port: number) {

  const env = getGlobalVar("env")
  const { port: _, serverName, docsPath, ipWhitelist } = config().serverConfig;

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

  await app.listen(port, () => {
    Logger.log(`Server Starts at ${port}`, 'serverInit');
    Logger.log(`serverUrl: ${fullURL}`, 'serverLinks');
    Logger.log(`serverDocs: ${fullURL}/docs`, 'serverLinks');
    Logger.log(`serverGraphql: ${fullURL}/graphql`, 'serverLinks');
  }
  );
}

// Sequential list of ports
const ports = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032, 3033, 3034, 3035, 3036, 3037, 3038, 3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048, 3049, 3050, 3051, 3052, 3053, 3054, 3055, 3056, 3057, 3058, 3059, 3060, 3061, 3062, 3063, 3064, 3065, 3066, 3067, 3068, 3069, 3070, 3071, 3072, 3073, 3074, 3075, 3076, 3077, 3078, 3079, 3080, 3081, 3082, 3083, 3084, 3085, 3086, 3087, 3088, 3089, 3090, 3091, 3092, 3093, 3094, 3095, 3096, 3097, 3098, 3099, 3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109, 3110, 3111, 3112, 3113, 3114, 3115, 3116, 3117, 3118, 3119, 3120, 3121, 3122, 3123, 3124, 3125, 3126, 3127, 3128, 3129, 3130, 3131, 3132, 3133, 3134, 3135, 3136, 3137, 3138];

for (let i = 0; i < ports.length; i++) {
  const port = ports[i];
  bootstrap(port)
}


