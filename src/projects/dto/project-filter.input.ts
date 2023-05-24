import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class ProjectFilter {
  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  userId?: string;

  @Field({ nullable: true })
  id?: string;
}
