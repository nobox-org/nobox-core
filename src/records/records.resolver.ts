import { Resolver, Query, Mutation, Args, Int, ResolveField } from '@nestjs/graphql';
import { GraphqlJwtAuthGuard } from '@/guards/graphql-jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { RecordsService } from './records.service';
import { Record } from './entities/record.entity';
import { CreateRecordInput } from './dto/create-record.input';
import { GetRecordsInput } from './dto/get-records.input';
import { UpdateRecordInput } from './dto/update-record.input';
import { MRecord } from '@/schemas';

const mapMRecordToRecord = (record: MRecord): Record => {
  return {
    id: String(record._id),
    ...record,
  }
};

@UseGuards(GraphqlJwtAuthGuard)
@Resolver(() => Record)
export class RecordsResolver {
  constructor(private readonly recordsService: RecordsService) { }

  @Mutation(() => Record)
  createRecord(@Args('createRecordInput') createRecordInput: CreateRecordInput) {
    return this.recordsService.create(createRecordInput);
  }

  @Query(() => [Record], { name: "records" })
  async getRecords(@Args('getRecordsInput') getRecordsInput: GetRecordsInput) {
    const records = await this.recordsService.getRecords({ ...getRecordsInput });
    return records.map(mapMRecordToRecord);
  }

  @Mutation(() => [Record], { name: "updateRecords" })
  updateRecordById(@Args('updateRecordsInput') { id, ...updateRecordsInput }: UpdateRecordInput) {
    return this.recordsService.updateRecordById(id, updateRecordsInput);
  }
}
