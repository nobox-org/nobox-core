import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { RecordSpaceModule } from '@/modules/record-spaces/record-spaces.module';
import { GateWayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [RecordSpaceModule, ProjectsModule],
  providers: [GateWayService],
  exports: [GateWayService],
  controllers: [GatewayController]
})

export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        GatewayController
      );
  }
}