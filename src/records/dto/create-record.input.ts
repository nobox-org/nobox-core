import { InputType, Field } from '@nestjs/graphql';
import { RecordFieldContentInput } from '../entities/record-field-content.input.entity';

@InputType()
export class CreateRecordInput {
  @Field({ description: 'Record Space Slug' })
  recordSpaceSlug: string;

  @Field({ description: 'Project Slug' })
  projectSlug: string;

  @Field(() => [RecordFieldContentInput], { description: 'Content of Fields' })
  fieldsContent: RecordFieldContentInput[];
}
