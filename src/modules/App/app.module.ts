import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from '@/interceptors/auth.interceptor';
import { ResponseInterceptor } from '@/interceptors/response.interceptor';
import { TraceMiddleware } from '@/middlewares/trace.middleware';
import { config } from 'dotenv';
import { AuthController } from '../auth/auth.controller';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { ClientFunctionsModule } from '../client-functions/client-functions.module';
import { ClientController } from '../client/client.controller';
import { ClientModule } from '../client/client.module';
import { GatewayController } from '../gateway/gateway.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { LoggerModule } from '../logger/logger.module';
import { ProjectsModule } from '../projects/projects.module';
import { RecordSpaceModule } from '../record-spaces/record-spaces.module';
import { RecordsModule } from '../records/records.module';
import { UserModule } from '../user/user.module';

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
      GatewayModule,
   ],
   controllers: [
      AppController,
      ClientController,
      AuthController,
      GatewayController,
   ],
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
         .forRoutes(ClientController, GatewayController);
   }
}
