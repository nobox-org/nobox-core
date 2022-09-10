import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { ProjectFilter } from './dto/project-filter.input';

@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) { }

  @Mutation(() => Project)
  createProject(@Args('createProjectInput') createProjectInput: CreateProjectInput) {
    return this.projectsService.create(createProjectInput);
  }

  @Query(() => [Project], { name: 'projects' })
  findAll(@Args('filter', { nullable: true }) filter?: ProjectFilter) {
    return this.projectsService.find(filter);
  }

  @Query(() => Project, { name: 'project', nullable: true })
  findOne(@Args('filter', { nullable: true }) filter?: ProjectFilter) {
    return this.projectsService.findOne(filter);
  }

  @Mutation(() => Project)
  updateProject(@Args('updateProjectInput', { nullable: true }) { id, slug, ...updates }: UpdateProjectInput) {
    return this.projectsService.update({ _id: id, slug }, updates);
  }

  @Mutation(() => Project)
  removeProject(@Args('id', { type: () => String }) id?: string, @Args('slug', { type: () => String }) slug?: string) {
    return this.projectsService.remove({ _id: id, slug });
  }
}

