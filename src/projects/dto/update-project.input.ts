import { CreateProjectInput } from './create-project.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateProjectInput extends PartialType(CreateProjectInput) {
  @Field({nullable: true})
  description?: string;

  @Field({nullable: true})
  name?: string;

  @Field({ nullable: true })
  id?: string;

  @Field({ nullable: true })
  slug?: string;
}
