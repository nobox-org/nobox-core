import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';

@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) { }

  @Mutation(() => Project)
  createProject(@Args('createProjectInput') createProjectInput: CreateProjectInput) {
    return this.projectsService.create(createProjectInput);
  }

  @Mutation(() => Project)
  updateProject(@Args('updateProjectInput') { id, ...updates }: UpdateProjectInput) {
    return this.projectsService.update({ _id: id }, updates);
  }
}

