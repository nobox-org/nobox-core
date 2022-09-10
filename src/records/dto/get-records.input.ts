import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetRecordsInput {
  @Field({ description: 'Record Space Slug' })
  recordSpaceSlug: string;

  @Field({ description: 'Project Slug' })
  projectSlug: string;
}
