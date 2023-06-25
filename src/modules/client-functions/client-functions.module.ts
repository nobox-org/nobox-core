import { ClientModule } from '@/modules/client/client.module';
import { RecordSpaceModule } from '@/modules/record-spaces/record-spaces.module';
import { Module } from '@nestjs/common';
import { ClientFunctionsService } from './client-functions.service';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [RecordSpaceModule, ClientModule, ProjectsModule],
  providers: [ClientFunctionsService],
  exports: [ClientFunctionsService]
})
export class ClientFunctionsModule { }
