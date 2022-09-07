import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetRecordsInput {
  @Field({ description: 'Record Space Slug' })
  recordSpaceSlug: string;

  @Field({ description: 'Record Space Project Slug'})
  projectSlug: string;
}
