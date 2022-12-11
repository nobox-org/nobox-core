import { InputType, Field } from '@nestjs/graphql';
import { Transform } from 'class-transformer';

@InputType()
export class CreateProjectInput {
  @Field()
  description?: string;

  @Field()
  name: string;

  @Field()
  @Transform((value) => value.toLowerCase())
  slug: string;
}
