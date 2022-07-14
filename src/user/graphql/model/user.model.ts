import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Interests, DiscoverySource } from '../enums';
import { Address } from './address.model';
import { DateOfBirth } from './date-of-birth.model';

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
  phoneNumber: string;

  @Field({ nullable: true })
  profileImage: string;
}