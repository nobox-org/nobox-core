import { RecordField } from '@/record-spaces/entities/record-field.entity';
import { ObjectType, Field} from '@nestjs/graphql';

@ObjectType("RecordFieldContentOutput")
export class RecordFieldContentOutput {
  @Field({ nullable: true })
  textContent: string;

  @Field({ nullable: true })
  numberContent: number;

  @Field(() => RecordField)
  field: RecordField;
}