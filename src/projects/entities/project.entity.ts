import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType("PostmarkOutput")
export class PostmarkOutput {
  @Field()
  apiKey: string

  @Field()
  senderEmail: string
}

@ObjectType("FirebaseOutput")
export class FirebaseOutput {
  @Field()
  privateKey: string

  @Field()
  projectId: string

  @Field()
  clientEmail: string
}

@ObjectType("ProjectKeysOutput")
export class ProjectKeysOutput {
  @Field({ nullable: true })
  postmark?: PostmarkOutput;

  @Field({ nullable: true })
  firebase?: FirebaseOutput;
}

@ObjectType("BusinessDetailsOutput")
export class BusinessDetailsOutput {
  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  name?: string;
}

@ObjectType()
export class Project {
  @Field()
  id: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  name: string;

  @Field()
  user: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  siteUrl?: string;

  @Field({ nullable: true })
  keys?: ProjectKeysOutput;

  @Field({ nullable: true })
  businessDetails?: BusinessDetailsOutput;
}
