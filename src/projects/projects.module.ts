import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Module({
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule { }