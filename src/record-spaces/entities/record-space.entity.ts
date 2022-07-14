import { ObjectType, Field } from '@nestjs/graphql';
import { RecordField } from './record-field.entity';
import { RecordStructure } from './record-structure.entity';

@ObjectType()
export class RecordSpace {
  @Field({ description: 'Record Space Id' })
  id: string;

  @Field({ description: 'Name of Record Space' })
  name: string;

  @Field({ description: 'Slug of Record Space' })
  slug: string;

  @Field({ description: 'description of record space' })
  description: string;

  @Field({ description: 'Record Space Project' })
  project: string;

  @Field(() => [RecordField], { description: 'Record Space Fields' })
  fields: RecordField[];

  @Field({ description: 'User who created field' })
  user: string;

  @Field(() => [RecordStructure], { description: 'Structure of record' })
  recordStructure?: RecordStructure[];
}
