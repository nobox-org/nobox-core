import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class SlugInput {
  @Field()
  slug?: string;
}
