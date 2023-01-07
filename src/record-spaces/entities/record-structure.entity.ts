import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { RecordStructureType } from '../dto/record-structure-type.enum';

@InputType("RecordStructureInput")
@ObjectType("RecordStructureObject")
export class RecordStructure {
  @Field()
  name: string;

  @Field({ nullable: true, defaultValue: "" })
  description: string;

  @Field()
  slug: string;

  @Field(() => RecordStructureType)
  type: RecordStructureType;

  @Field({ nullable: true, defaultValue: false })
  required: boolean;

  @Field({ nullable: true, defaultValue: false })
  unique: boolean;

  @Field({ nullable: true, defaultValue: false })
  hashed: boolean;
}
