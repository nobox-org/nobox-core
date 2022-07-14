import { CreateRecordInput } from './create-record.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRecordInput extends PartialType(CreateRecordInput) {
  @Field(() => Int)
  id: number;
}
