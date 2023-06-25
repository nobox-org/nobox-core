import { Module } from '@nestjs/common';
import { RecordSpacesService } from './record-spaces.service';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
   imports: [ProjectsModule],
   providers: [RecordSpacesService],
   exports: [RecordSpacesService],
})
export class RecordSpaceModule {}
