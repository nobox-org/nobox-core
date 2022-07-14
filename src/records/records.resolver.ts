import { Resolver, Query, Mutation, Args, Int, ResolveField } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { RecordsService } from './records.service';
import { Record } from './entities/record.entity';
import { CreateRecordInput } from './dto/create-record.input';
import { GetRecordsInput } from './dto/get-records.input';

@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => Record)
export class RecordsResolver {
  constructor(private readonly recordsService: RecordsService) { }

  @Mutation(() => Record)
  createRecord(@Args('createRecordInput') createRecordInput: CreateRecordInput) {
    return this.recordsService.create(createRecordInput);
  }

  @Query(() => [Record], { name: "records" })
  getRecords(@Args('getRecordsInput') getRecordsInput: GetRecordsInput) {
    return this.recordsService.getRecords(getRecordsInput);
  }
}
