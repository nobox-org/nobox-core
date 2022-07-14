import { Resolver, Query, Mutation, Args, Int, Parent, ResolveField } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { RecordSpacesService } from './record-spaces.service';
import { RecordSpace } from './entities/record-space.entity';
import { CreateRecordSpaceInput } from './dto/create-record-space.input';
import { UpdateRecordSpaceInput } from './dto/update-record-space.input';
import { RecordField } from './entities/record-field.entity';


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
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.recordSpacesService.findOne({ _id: id });
  }

  @Mutation(() => RecordSpace)
  updateRecordSpace(@Args('updateRecordSpaceInput') updateRecordSpaceInput: UpdateRecordSpaceInput) {
    return this.recordSpacesService.update({ _id: updateRecordSpaceInput.id }, updateRecordSpaceInput);
  }

  @Mutation(() => RecordSpace)
  removeRecordSpace(@Args('id', { type: () => Int }) id: number) {
    return this.recordSpacesService.remove({ _id: id });
  }

  @ResolveField('fields', () => [RecordField])
  async fields(@Parent() recordSpace: RecordSpace) {
    const { id } = recordSpace;
    return this.recordSpacesService.getFields({ recordSpace: (id) });
  }
}
