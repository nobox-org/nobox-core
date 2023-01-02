import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { AuthOptionsScope } from '../dto/auth-options-scope';

@InputType("RecordSpaceAuthOptionsInput")
@ObjectType("RecordSpaceAuthOptionsObject")
export class RecordSpaceAuthOptions {
  @Field()
  active: boolean;

  @Field()
  space: string;

  @Field()
  token: string;

  @Field(() => [AuthOptionsScope])
  scope: AuthOptionsScope[];
}
