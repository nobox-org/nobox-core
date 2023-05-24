import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => Int)
  id: number;

  @Field()
  _id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  profileImage: string;
}