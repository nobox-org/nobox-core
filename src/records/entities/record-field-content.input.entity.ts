import { Field, InputType } from '@nestjs/graphql';

@InputType("RecordFieldContentInput")
export class RecordFieldContentInput {
  @Field({ nullable: true })
  textContent: string;

  @Field({ nullable: true })
  numberContent: string;

  @Field({ nullable: true })
  booleanContent: string;

  @Field({ nullable: true })
  arrayContent: string;

  @Field()
  field: string;
}