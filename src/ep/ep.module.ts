import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { ProjectsModule } from '@/projects/projects.module';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';
import { RecordsModule } from '@/records/records.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EpController } from './ep.controller';
import { EpService } from './ep.service';
import { EpServiceMongoSyntaxUtil } from './ep.service.utils.mongo-syntax';

@Module({
    imports: [RecordSpacesModule, RecordsModule, ProjectsModule],
    providers: [EpService, EpServiceMongoSyntaxUtil],
    controllers: [EpController],
    exports: [EpService]
})

export class EpModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {

        consumer
            .apply(AuthMiddleware)
            .forRoutes(
                EpController
            );
    }
}

