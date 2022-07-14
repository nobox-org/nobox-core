import { CreateRecordSpaceInput } from './create-record-space.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRecordSpaceInput extends PartialType(CreateRecordSpaceInput) {
  @Field(() => Int)
  id: number;
}
