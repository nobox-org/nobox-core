import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class GetRecordsInput {
  @Field({ description: 'Record Space Id' })
  recordSpace: string;
}
