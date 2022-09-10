import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RecordSpaceFilter {
  @Field({ description: 'Name of Record Space', nullable: true })
  name?: string;

  @Field({ description: 'description of record space', nullable: true })
  description?: string;

  @Field({ description: 'Slug of Record Space', nullable: true })
  slug?: string;

  @Field({ description: "Id of Record Space", nullable: true })
  id?: string;

  @Field({ description: "Slug of Project" })
  projectSlug: string;
}
