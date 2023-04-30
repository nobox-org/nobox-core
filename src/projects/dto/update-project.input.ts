import { CreateProjectInput } from './create-project.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
@InputType()
export class Postmark {
  @Field({
    description: "Postmark API Key"
  })
  apiKey: string

  @Field({
    description: "Postmark Sender Email"
  })
  senderEmail: string
}

@InputType()
export class Firebase {
  @Field({
    description: "Firebase Private Key"
  })
  privateKey: string

  @Field({
    description: "Firebase Project ID"
  })
  projectId: string

  @Field({
    description: "Firebase Client Email"
  })
  clientEmail: string
}


@InputType()
export class Keys {
  @Field({ nullable: true })
  postmark?: Postmark

  @Field({ nullable: true })
  firebase?: Firebase
}


@InputType()
export class BusinessDetails {
  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  name?: string;
}

@InputType()
export class UpdateProjectInput extends PartialType(CreateProjectInput) {
  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  siteUrl?: string;

  @Field({ nullable: true })
  keys?: Keys

  @Field({ nullable: true })
  businessDetails?: BusinessDetails;
}
