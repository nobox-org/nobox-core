import { Field, ObjectType } from '@nestjs/graphql';
import { RecordStructureType } from '../dto/record-structure-type.enum';

@ObjectType("RecordField")
export class RecordField {
  @Field()
  id: string;

  @Field({ nullable: true })
  description: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  required: boolean;

  @Field()
  type: RecordStructureType;
}


