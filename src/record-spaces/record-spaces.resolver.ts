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
import { MRecordSpace } from '@/schemas';
import { ObjectId } from 'mongodb';


const mapMRecordSpaceToRecordSpace = (recordSpace: MRecordSpace): RecordSpace => {
  return {
    id: String(recordSpace._id),
    fields: recordSpace.hydratedRecordFields.map((field) => {
      return {
        id: String(field._id),
        ...field,
      };
    }),
    fieldIds: recordSpace.recordFields.map(String),
    ...recordSpace,
  }
};


@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => RecordSpace)
export class RecordSpacesResolver {
  constructor(private readonly recordSpacesService: RecordSpacesService) { }

  @Mutation(() => RecordSpace)
  createRecordSpace(@Args('createRecordSpaceInput') createRecordSpaceInput: CreateRecordSpaceInput) {
    return this.recordSpacesService.create({ createRecordSpaceInput });
  }

  @Mutation(() => RecordSpace)
  createFields(@Args('createFieldsInput') createFieldsInput: CreateFieldsInput) {
    return this.recordSpacesService.createFieldsFromNonIdProps(createFieldsInput);
  }

  @Query(() => [RecordSpace], { name: 'recordSpaces' })
  async findAll(@Args('recordSpaceFilter') query: RecordSpaceFilter) {
    const recordSpace = await this.recordSpacesService.find(query);
    return recordSpace.map(mapMRecordSpaceToRecordSpace);
  }

  @Query(() => RecordSpace, { name: 'recordSpace' })
  async findOne(@Args('recordSpaceFilter') query: RecordSpaceFilter) {
    const recordSpace = await this.recordSpacesService.findOne({ query });
    return mapMRecordSpaceToRecordSpace(recordSpace);
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
  async toggleDeveloperMode(@Args('id') id: string, @Args('enable') enable: boolean, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    const recordSpace = await this.recordSpacesService.update({ query: { _id: new ObjectId(id) }, update: { $set: { developerMode: enable } }, scope });
    return mapMRecordSpaceToRecordSpace(recordSpace);
  }

  @Mutation(() => RecordSpace)
  addAdminToRecordSpace(@Args('id') id: string, @Args('userId') userId: string, @Args('actionScope', { type: () => ACTION_SCOPE }) scope: ACTION_SCOPE) {
    return this.recordSpacesService.addAdminToRecordSpace(id, userId, scope);
  }

  @ResolveField('endpoints', () => [Endpoint])
  async getEndpoints(@Parent() recordSpace: RecordSpace) {
    return this.recordSpacesService.getEndpoints(recordSpace);
  }
}
