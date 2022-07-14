
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class RegisterUserInput {
    @Field()
    firstName: string;

    @Field()
    lastName: string;

    @Field()
    phoneNumber: string;

    @Field()
    password: string;
}
