import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { RecordSpaceModule } from '@/modules/record-spaces/record-spaces.module';
import { RecordsModule } from '@/modules/records/records.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientServiceMongoSyntaxUtil } from './client.service.utils.mongo-syntax';
import { ClientFunctionsService } from '../client-functions/client-functions.service';

@Module({
    imports: [RecordSpaceModule, RecordsModule, ProjectsModule],
    providers: [ClientFunctionsService, ClientService, ClientServiceMongoSyntaxUtil],
    controllers: [ClientController],
    exports: [ClientService]
})

export class ClientModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuthMiddleware)
            .forRoutes(
                ClientController
            );
    }
}