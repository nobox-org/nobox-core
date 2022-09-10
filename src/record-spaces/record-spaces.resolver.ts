import { Resolver, Query, Mutation, Args, Int, Parent, ResolveField } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { RecordSpacesService } from './record-spaces.service';
import { RecordSpace } from './entities/record-space.entity';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { UpdateRecordSpaceInput } from './dto/update-record-space.input';
import { RecordField } from './entities/record-field.entity';
import { Endpoint } from './entities/endpoint.entity';
import { ACTION_SCOPE } from './dto/action-scope.enum';


@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => RecordSpace)
export class RecordSpacesResolver {
  constructor(private readonly recordSpacesService: RecordSpacesService) { }

  @Mutation(() => RecordSpace)
  createRecordSpace(@Args('createRecordSpaceInput') createRecordSpaceInput: CreateRecordSpaceInput) {
    return this.recordSpacesService.create(createRecordSpaceInput);
  }

  @Query(() => [RecordSpace], { name: 'recordSpaces' })
  findAll() {
    return this.recordSpacesService.find();
  }

  @Query(() => RecordSpace, { name: 'recordSpace' })
  findOne(@Args('id') id: string, @Args('projectId') projectId: string, ) {
    return this.recordSpacesService.findOne({ _id: id, project: projectId  });
  }

  @Query(() => [RecordSpace], { name: 'recordSpaceByProjectId' })
  findByProjectId(@Args('projectId') projectId: string) {
    return this.recordSpacesService.find({ project: projectId });
  }

  @Mutation(() => RecordSpace)
  updateRecordSpace(@Args('updateRecordSpaceInput') updateRecordSpaceInput: UpdateRecordSpaceInput) {
    return this.recordSpacesService.update({ _id: updateRecordSpaceInput.id }, { $set: updateRecordSpaceInput });
  }

  @Mutation(() => Boolean)
  removeRecordSpace(@Args('id') id: string) {
    return this.recordSpacesService.remove({ _id: id });
  }

  @Mutation(() => RecordSpace)
  toggleDeveloperMode(@Args('id') id: string, @Args('enable') enable: boolean, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    return this.recordSpacesService.update({ _id: id }, { $set: { developerMode: enable } }, scope);
  }

  @Mutation(() => RecordSpace)
  addAdminToRecordSpace(@Args('id') id: string, @Args('userId') userId: string, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    return this.recordSpacesService.addAdminToRecordSpace(id, userId, scope);
  }

  @ResolveField('fields', () => [RecordField])
  async fields(@Parent() recordSpace: RecordSpace) {
    const { id } = recordSpace;
    return this.recordSpacesService.getFields({ recordSpace: (id) });
  }

  @ResolveField('endpoints', () => [Endpoint])
  async getEndpoints(@Parent() recordSpace: RecordSpace) {
    const { id } = recordSpace;
    return this.recordSpacesService.getEndpoints({ recordSpace: (id) });
  }
}
