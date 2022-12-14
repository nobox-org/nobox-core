import { MiddlewareConsumer, Module, NestModule, } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { graphqlUploadExpress } from "graphql-upload-minimal";
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import config from './config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MinioModule } from './minio/module';
import { FileModule } from './file/file.module';
import { LoggerModule } from './logger/logger.module';
import { MailModule } from './mail/mail.module';
import { join } from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { CustomLoggerInstance } from './logger/logger.service';
import { RecordSpacesModule } from './record-spaces/record-spaces.module';
import { ProjectsModule } from './projects/projects.module';
import { RecordsModule } from './records/records.module';
import { EpController } from './ep/ep.controller';
import { EpService } from './ep/ep.service';
import { EpModule } from './ep/ep.module';
import { TraceMiddleware } from './middlewares/trace.middleware';

const dbConfig = config().dbConfig;

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
    }),
    MongooseModule.forRoot(dbConfig.connString),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      debug: true,
      path: 'graphql',
      formatError: (error: GraphQLError): GraphQLFormattedError => {
        const exception: any = error?.extensions?.exception;
        const message = exception.response || exception.message || error.message;
        CustomLoggerInstance.sLog(message, "GraphQLModule:FormatError")
        return {
          message: message,
        }
      },
    }),
    UserModule,
    AuthModule,
    MinioModule,
    FileModule,
    LoggerModule,
    MailModule,
    RecordSpacesModule,
    ProjectsModule,
    RecordsModule,
    EpModule,
  ],
  controllers: [AppController, EpController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
  ],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(graphqlUploadExpress({ maxFileSize: 100000000, maxFiles: 10 }),).forRoutes('/graphql');
    consumer
      .apply(TraceMiddleware)
      .forRoutes(
        EpController
      );
  }
}

