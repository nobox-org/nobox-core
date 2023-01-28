import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType("RecordFieldContentOutput")
export class RecordFieldContentOutput {
  @Field({ nullable: true })
  textContent: string;

  @Field({ nullable: true })
  numberContent: string;

  @Field({ nullable: true })
  booleanContent: string;

  @Field()
  field: string;
}