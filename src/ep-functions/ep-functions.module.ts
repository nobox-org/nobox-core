import { EpModule } from '@/ep/ep.module';
import { RecordSpacesModule } from '@/record-spaces/record-spaces.module';
import { Module } from '@nestjs/common';
import { EpFunctionsService } from './ep-functions.service';
import { ProjectsModule } from '@/projects/projects.module';

@Module({
  imports: [RecordSpacesModule, EpModule, ProjectsModule],
  providers: [EpFunctionsService],
  exports: [EpFunctionsService]
})
export class EpFunctionsModule { }
