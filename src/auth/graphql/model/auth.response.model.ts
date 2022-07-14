import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthResponse {
  @Field({ nullable: true })
  token?: string;
}