import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType("PostmarkOutput")
export class PostmarkOutput {
  @Field()
  apiKey: string
}

@ObjectType("ProjectKeysOutput")
export class ProjectKeysOutput {
  @Field({ nullable: true })
  postmark?: PostmarkOutput
}

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

  @Field({ nullable: true })
  keys: ProjectKeysOutput;
}
