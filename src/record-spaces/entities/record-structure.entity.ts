import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { RecordStructureType } from '../dto/record-structure-type.enum';

@InputType("RecordStructureInput")
@ObjectType("RecordStructureObject")
export class RecordStructure {
  @Field()
  name: string;

  @Field()
  description: string;

  @Field()
  slug: string;

  @Field(() => RecordStructureType )
  type: RecordStructureType;
}
