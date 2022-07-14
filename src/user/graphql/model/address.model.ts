import { Field, InputType, ObjectType } from '@nestjs/graphql';

@ObjectType("Address")
@InputType("AddressInput")
export class Address {
    @Field()
    number: string;

    @Field()
    street: string;

    @Field()
    city: string;

    @Field()
    country: string;
}
