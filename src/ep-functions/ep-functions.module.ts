import { EpModule } from '@/ep/ep.module';
import { RecordSpaceModule } from '@/record-spaces/record-spaces.module';
import { Module } from '@nestjs/common';
import { EpFunctionsService } from './ep-functions.service';
import { ProjectsModule } from '@/projects/projects.module';

@Module({
  imports: [RecordSpaceModule, EpModule, ProjectsModule],
  providers: [EpFunctionsService],
  exports: [EpFunctionsService]
})
export class EpFunctionsModule { }
