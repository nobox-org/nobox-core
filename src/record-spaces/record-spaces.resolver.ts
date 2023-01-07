import { Resolver, Query, Mutation, Args, Parent, ResolveField } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { RecordSpacesService } from './record-spaces.service';
import { RecordSpace } from './entities/record-space.entity';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { UpdateRecordSpaceInput } from './dto/update-record-space.input';
import { RecordField } from './entities/record-field.entity';
import { Endpoint } from './entities/endpoint.entity';
import { ACTION_SCOPE } from './dto/action-scope.enum';
import { RecordSpaceFilter } from './dto/record-space-filter.input';
import { CreateFieldsInput } from './dto/create-fields.input';


@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => RecordSpace)
export class RecordSpacesResolver {
  constructor(private readonly recordSpacesService: RecordSpacesService) { }

  @Mutation(() => RecordSpace)
  createRecordSpace(@Args('createRecordSpaceInput') createRecordSpaceInput: CreateRecordSpaceInput) {
    return this.recordSpacesService.create(createRecordSpaceInput);
  }

  @Mutation(() => RecordSpace)
  createFields(@Args('createFieldsInput') createFieldsInput: CreateFieldsInput) {
    return this.recordSpacesService.createFieldsFromNonIdProps(createFieldsInput);
  }

  @Query(() => [RecordSpace], { name: 'recordSpaces' })
  findAll(@Args('recordSpaceFilter') query: RecordSpaceFilter) {
    return this.recordSpacesService.find(query);
  }

  @Query(() => RecordSpace, { name: 'recordSpace' })
  findOne(@Args('recordSpaceFilter') query: RecordSpaceFilter) {
    return this.recordSpacesService.findOne({ query });
  }

  @Mutation(() => RecordSpace)
  updateRecordSpace(@Args('updateRecordSpaceInput') { slug, ...update }: UpdateRecordSpaceInput) {
    return this.recordSpacesService.update({ query: { slug }, update: { $set: update } });
  }

  @Mutation(() => Boolean)
  removeRecordSpace(@Args('slug') slug: string, @Args('projectSlug') projectSlug: string) {
    return this.recordSpacesService.remove({ query: { slug }, projectSlug });
  }

  @Mutation(() => RecordSpace)
  toggleDeveloperMode(@Args('id') id: string, @Args('enable') enable: boolean, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    return this.recordSpacesService.update({ query: { _id: id }, update: { $set: { developerMode: enable } }, scope });
  }

  @Mutation(() => RecordSpace)
  addAdminToRecordSpace(@Args('id') id: string, @Args('userId') userId: string, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    return this.recordSpacesService.addAdminToRecordSpace(id, userId, scope);
  }

  @ResolveField('fields', () => [RecordField])
  async fields(@Parent() recordSpace: RecordSpace) {
    return this.recordSpacesService.getFields(recordSpace.fieldIds);
  }

  @ResolveField('endpoints', () => [Endpoint])
  async getEndpoints(@Parent() recordSpace: RecordSpace) {
    return this.recordSpacesService.getEndpoints(recordSpace);
  }
}
