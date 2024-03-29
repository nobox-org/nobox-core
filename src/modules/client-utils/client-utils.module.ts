import { ProjectsModule } from '@/modules/projects/projects.module';
import { RecordSpaceModule } from '@/modules/record-spaces/record-spaces.module';
import { RecordsModule } from '@/modules/records/records.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClientUtilsController } from './client-utils.controller';
import { ClientUtilsService } from './client-utils.service';
import { ClientAuthMiddleware } from '@/middlewares';

@Module({
   imports: [RecordSpaceModule, RecordsModule, ProjectsModule],
   providers: [
      ClientUtilsService,
   ],
   controllers: [ClientUtilsController],
   exports: [ClientUtilsService],
})

export class ClientUtilsModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
      consumer.apply(ClientAuthMiddleware).forRoutes(ClientUtilsController);
   }
}
