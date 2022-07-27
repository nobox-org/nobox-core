import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Project {
  @Field()
  id: string;

  @Field()
  description: string;

  @Field()
  name: string;

  @Field()
  user: string;

  @Field()
  slug: string;
}
