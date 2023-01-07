import { Global, Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';

@Global()
@Module({
  providers: [ProjectsResolver, ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule { }
