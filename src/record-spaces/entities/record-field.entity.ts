import { RecordStructureType } from '@/types';
import { Field, ObjectType } from '@nestjs/graphql';

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


