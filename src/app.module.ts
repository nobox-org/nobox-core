import { MiddlewareConsumer, Module, NestModule, } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import config from './config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { LoggerModule } from './modules/logger/logger.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { RecordSpaceModule } from './modules/record-spaces/record-spaces.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RecordsModule } from './modules/records/records.module';
import { ClientController } from './modules/client/client.controller';
import { ClientModule } from './modules/client/client.module';
import { TraceMiddleware } from './middlewares/trace.middleware';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { GatewayController } from './modules/gateway/gateway.controller';
import { GatewayModule } from './modules/gateway/gateway.module';
import { ClientFunctionsModule } from './modules/client-functions/client-functions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
    }),
    UserModule,
    AuthModule,
    LoggerModule,
    RecordSpaceModule,
    ProjectsModule,
    RecordsModule,
    ClientModule,
    ClientFunctionsModule,
    GatewayModule
  ],
  controllers: [AppController, ClientController, AuthController, GatewayController],
  providers: [
    AppService,
    AuthService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceMiddleware)
      .forRoutes(
        ClientController,
        GatewayController,
      );
  }
}

