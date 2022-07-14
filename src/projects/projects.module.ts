import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { LoggerModule } from '@/logger/logger.module';
import { ProjectSchema, Project } from '@/schemas';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]), LoggerModule],
  providers: [ProjectsResolver, ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule { }
