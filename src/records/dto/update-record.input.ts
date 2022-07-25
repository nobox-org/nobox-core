import { InputType, Field } from '@nestjs/graphql';
import { RecordFieldContentInput } from '../entities/record-field-content.input.entity';

@InputType()
export class UpdateRecordInput {
  @Field()
  id: string;

  @Field(() => [RecordFieldContentInput], { description: 'Content of Fields' })
  fieldsContent: RecordFieldContentInput[];
}
