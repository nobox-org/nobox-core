import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateProjectInput {
  @Field()
  description: string;

  @Field()
  name: string;

  @Field()
  slug: string;
}
