import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateRecordSpaceInput {
  @Field()
  slug: string;

  @Field({ description: 'Name of Record Space', nullable: true })
  name: string;

  @Field({ description: 'description of record space', nullable: true })
  description?: string;

  @Field({ description: 'Slug of project', nullable: true })
  projectSlug?: string;
}
