import { ObjectType, Field, HideField } from '@nestjs/graphql';
import { Endpoint } from './endpoint.entity';
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


  @Field({ description: 'Project of Record Space' })
  @HideField()
  project: string;

  @Field({ description: 'description of record space' })
  description: string;

  @Field(() => [RecordField], { description: 'Record Space Fields' })
  fields: RecordField[];

  @Field(() => [String], { description: 'Record Space Field Ids' })
  fieldIds: string[];

  @Field({ description: 'User who created Record Space' })
  user: string;

  @Field(() => [String], { description: 'Users with Record Space', nullable: true })
  admins: string[];

  @Field({ description: 'Determines if user can access endpoints' })
  developerMode: boolean;

  @Field(() => [RecordStructure], { description: 'Structure of record' })
  recordStructure?: RecordStructure[];

  @Field(() => [Endpoint], { description: 'Auto Generated Endpoints', nullable: true })
  endpoints?: Endpoint[];
}
