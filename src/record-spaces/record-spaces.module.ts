import { Module } from '@nestjs/common';
import { RecordSpacesService } from './record-spaces.service';
import { RecordSpacesResolver } from './record-spaces.resolver';
import { ProjectsModule } from '@/projects/projects.module';

@Module({
  imports: [ProjectsModule],
  providers: [RecordSpacesResolver, RecordSpacesService],
  exports: [RecordSpacesService]
})
export class RecordSpacesModule { }
