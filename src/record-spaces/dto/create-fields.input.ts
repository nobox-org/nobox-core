import { InputType, Field } from '@nestjs/graphql';
import { RecordStructure } from '../entities/record-structure.entity';

@InputType()
export class CreateFieldsInput {
  @Field({ description: "Slug of Record Space" })
  recordSpaceSlug: string;

  @Field({ description: 'Slug of project' })
  projectSlug?: string;

  @Field(() => [RecordStructure], { description: 'Field Structure' })
  recordStructure: RecordStructure[];
}
