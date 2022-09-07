import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field({ nullable: true})
  description: string;

  @Field()
  name: string;

  @Field()
  slug: string;
}
